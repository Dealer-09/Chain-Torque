import React, { Suspense, useRef, useState, useImperativeHandle, forwardRef, useEffect, useCallback } from 'react';
import { useThree, invalidate } from '@react-three/fiber';
import { OrbitControls, TransformControls, Grid, Box, Sphere, Html, useGLTF, Center, AdaptiveDpr, AdaptiveEvents, GizmoHelper, GizmoViewport, GizmoViewcube, useGizmoContext } from '@react-three/drei';
import * as THREE from 'three';
import cadClient from '../cad/cadClient';
import { useSettingsStore } from '../store/settingsStore';
import { getNavPreset } from '../three/navPresets';
import { sampleSketchPoints } from '../utils/geometryUtils';
import MeshEditor from './MeshEditor';
import StatsSampler from '../perf/StatsSampler';
import { useAdaptiveQuality } from '../perf/useAdaptiveQuality';
import { ensureBoundsTree, disposeBoundsTreeSafe, accelerateSubtree } from '../three/culling';
import LODMesh, { LOD_VERTEX_THRESHOLD } from '../three/LODMesh';
import InstancedParts from '../three/InstancedParts';
import RendererProvider from '../three/RendererProvider';

// Work plane grid. raycast is disabled so the grid never intercepts selection
// clicks — clicking the ground then counts as an empty-space miss (deselect)
// rather than a hit on the grid mesh.
const NO_RAYCAST = () => null;
// Blender-style ground: an infinite grid that follows the camera so it always
// reaches the horizon instead of running off a finite 30-unit plane. fadeDistance
// is large and fadeStrength gentle so it stays visible when zoomed out, yet still
// dissolves at the far edge rather than aliasing into a hard line.
const WorkPlane = () => {
  const theme = useSettingsStore((s) => s.theme);
  const gridRef = useRef();

  const getActiveTheme = (themeVal) => {
    if (themeVal === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'dark';
    }
    return themeVal;
  };
  const activeTheme = getActiveTheme(theme);

  useEffect(() => {
    if (gridRef.current && gridRef.current.material) {
      gridRef.current.material.side = THREE.DoubleSide;
      gridRef.current.material.needsUpdate = true;
    }
  }, []);

  return (
    <Grid
      ref={gridRef}
      raycast={NO_RAYCAST}
      infiniteGrid
      followCamera={false}
      cellSize={1}
      cellThickness={0.6}
      cellColor={activeTheme === 'light' ? '#b8c2cc' : '#404040'}
      sectionSize={10}
      sectionThickness={1.2}
      sectionColor={activeTheme === 'light' ? '#8a99a6' : '#555555'}
      fadeDistance={400}
      fadeStrength={1.5}
      position={[0, 0, 0]}
    />
  );
};

// Component to load external GLB/GLTF models — exposes groupRef for TransformControls
const LoadedModel = forwardRef(({ url, onLoad, onModelCaptured, onClick, transform, featureId, registerRef }, ref) => {
  const groupRef = useRef();
  const { scene } = useGLTF(url, true);
  const capturedRef = useRef(false);

  // Expose the group ref to parent
  useImperativeHandle(ref, () => groupRef.current);

  // Register/unregister this solid's group so the Scene can attach the gizmo to
  // it when this feature is selected (from the viewport OR the Feature Tree).
  useEffect(() => {
    if (registerRef && featureId) registerRef(featureId, groupRef.current);
    return () => { if (registerRef && featureId) registerRef(featureId, null); };
  }, [featureId, registerRef]);

  useEffect(() => {
    if (!scene) return;

    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    let totalVertexCount = 0;

    // Collect all mesh geometries for capture
    const allVertices = [];
    const allIndices = [];
    let indexOffset = 0;

    scene.traverse((child) => {
      if (child.isMesh && child.geometry?.attributes?.position) {
        const posAttr = child.geometry.attributes.position;
        totalVertexCount += posAttr.count;

        // Copy vertices (applying world matrix for correct positioning)
        const worldMatrix = child.matrixWorld;
        for (let i = 0; i < posAttr.count; i++) {
          const v = new THREE.Vector3().fromBufferAttribute(posAttr, i);
          v.applyMatrix4(worldMatrix);
          allVertices.push(v.x, v.y, v.z);
        }

        // Copy indices (offset by previous vertex count)
        const idx = child.geometry.index;
        if (idx) {
          for (let i = 0; i < idx.count; i++) {
            allIndices.push(idx.getX(i) + indexOffset);
          }
        } else {
          for (let i = 0; i < posAttr.count; i++) {
            allIndices.push(i + indexOffset);
          }
        }
        indexOffset += posAttr.count;
      }
    });

    if (onLoad) {
      onLoad({ vertices: totalVertexCount, size });
    }

    // Capture mesh data into features (only once per URL)
    if (onModelCaptured && !capturedRef.current && allVertices.length > 0) {
      capturedRef.current = true;
      const meshData = {
        vertices: new Float32Array(allVertices),
        indices: new Uint32Array(allIndices),
        normals: new Float32Array(allVertices.length)
      };
      onModelCaptured(meshData);
    }

    // Under frameloop="demand" the newly-loaded model won't appear until a render
    // is requested. Invalidate now and on the next frame (after layout settles).
    invalidate();
    requestAnimationFrame(() => invalidate());
  }, [scene, onLoad, onModelCaptured]);

  // Center the model using bounding box
  const centeredScene = React.useMemo(() => {
    const clone = scene.clone();
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    clone.position.sub(center);
    accelerateSubtree(clone); // fast picking on imported meshes
    return clone;
  }, [scene]);

  // Free GPU memory when the model URL changes or this component unmounts.
  // The clone shares the cached GLTF's geometries/materials, so clearing the
  // drei cache entry is the correct release point (prevents VRAM growth as the
  // user loads different models — fatal on 4GB Chromebooks).
  useEffect(() => {
    return () => {
      try { useGLTF.clear(url); } catch { /* noop */ }
    };
  }, [url]);

  const t = transform || {};

  return (
    <group
      ref={groupRef}
      position={t.position || [0, 0, 0]}
      rotation={t.rotation || [0, 0, 0]}
      scale={t.scale || [1, 1, 1]}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(groupRef.current);
      }}
    >
      <primitive object={centeredScene} />
    </group>
  );
});

// Camera controller — exposes orbit controls ref so TransformControls can disable it
const CameraController = forwardRef(({ orbitRef, navPreset }, ref) => {
  const { camera } = useThree();
  const controlsRef = useRef();

  // Sync internal ref with external orbitRef
  useEffect(() => {
    if (orbitRef && controlsRef.current) {
      orbitRef.current = controlsRef.current;
    }
  }, [orbitRef]);

  useImperativeHandle(ref, () => ({
    fitToScreen: () => {
      camera.position.set(8, 8, 8);
      camera.lookAt(0, 1, 0);
      controlsRef.current?.target.set(0, 1, 0);
      controlsRef.current?.update();
    },
    setFrontView: () => {
      camera.position.set(0, 1, 10);
      camera.lookAt(0, 1, 0);
      controlsRef.current?.target.set(0, 1, 0);
      controlsRef.current?.update();
    },
    setTopView: () => {
      camera.position.set(0, 10, 0);
      camera.lookAt(0, 0, 0);
      controlsRef.current?.target.set(0, 0, 0);
      controlsRef.current?.update();
    },
    setRightView: () => {
      camera.position.set(10, 1, 0);
      camera.lookAt(0, 1, 0);
      controlsRef.current?.target.set(0, 1, 0);
      controlsRef.current?.update();
    },
    setIsoView: () => {
      camera.position.set(8, 8, 8);
      camera.lookAt(0, 1, 0);
      controlsRef.current?.target.set(0, 1, 0);
      controlsRef.current?.update();
    },
    zoomIn: () => {
      const pos = camera.position.clone();
      const target = controlsRef.current?.target || { x: 0, y: 1, z: 0 };
      const direction = pos.clone().sub(target).normalize();
      const distance = pos.distanceTo(target);
      const newDistance = Math.max(3, distance * 0.8);
      camera.position.copy(target).add(direction.multiplyScalar(newDistance));
      controlsRef.current?.update();
    },
    zoomOut: () => {
      const pos = camera.position.clone();
      const target = controlsRef.current?.target || { x: 0, y: 1, z: 0 };
      const direction = pos.clone().sub(target).normalize();
      const distance = pos.distanceTo(target);
      const newDistance = Math.min(50, distance * 1.2);
      camera.position.copy(target).add(direction.multiplyScalar(newDistance));
      controlsRef.current?.update();
    }
  }));

  return (
    <OrbitControls
      makeDefault
      ref={(controls) => {
        controlsRef.current = controls;
        if (orbitRef && controls) {
          orbitRef.current = controls;
        }
      }}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      // Mouse-drag mapping + inertia + zoom-to-cursor come from the active
      // navigation preset (Default / SolidWorks / Blender). Changing the preset
      // re-applies these props live on the existing OrbitControls instance.
      mouseButtons={navPreset.mouseButtons}
      enableDamping={navPreset.enableDamping}
      dampingFactor={navPreset.dampingFactor}
      zoomToCursor={navPreset.zoomToCursor}
      // Wide zoom range: get right up to a feature, or pull back to frame a whole
      // assembly. (Was clamped to 3..50, which boxed the user in.)
      minDistance={0.2}
      maxDistance={2000}
      // Full vertical tumble (just shy of the poles to avoid gimbal flip), so you
      // can orbit under the model. The old PI/1.8 clamp was the "invisible wall".
      minPolarAngle={0.01}
      maxPolarAngle={Math.PI - 0.01}
      target={[0, 1, 0]}
      onChange={() => invalidate()}
    />
  );
});

// Extruded mesh from OpenCascade geometry. Heavy solids render through a
// distance-based LOD; selection raycasts use a three-mesh-bvh bounds tree.
//
// Structure (Blender/SolidWorks Object-Mode convention):
//   <group>  <- carries the USER transform (move/rotate/scale gizmo target),
//               registered so the shared TransformControls can attach to it
//     <mesh rotation=[-PI/2,0,0]>  <- fixed OC Z-up -> three Y-up orientation
// Keeping the two transforms on separate nodes means the gizmo edits a clean
// object frame instead of fighting the baked coordinate-conversion rotation.
const ExtrudedMesh = ({ featureId, meshData, color = '#4ecdc4', transform, visible = true, registerRef, onSelect }) => {
  const groupRef = useRef();

  const geometry = React.useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(meshData.vertices, 3));
    geo.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
    geo.computeVertexNormals();
    ensureBoundsTree(geo);
    return geo;
  }, [meshData]);

  // Clean up WebGL buffers when component unmounts or geometry is recalculated
  React.useEffect(() => {
    return () => {
      disposeBoundsTreeSafe(geometry);
      geometry.dispose();
    };
  }, [geometry]);

  // Register/unregister this solid's group so the Scene can attach the gizmo to
  // it when this feature is selected (from the viewport OR the Feature Tree).
  React.useEffect(() => {
    if (registerRef) registerRef(featureId, groupRef.current);
    return () => { if (registerRef) registerRef(featureId, null); };
  }, [featureId, registerRef]);

  const t = transform || {};
  const heavy = (meshData?.vertices?.length ?? 0) / 3 >= LOD_VERTEX_THRESHOLD;

  return (
    <group
      ref={groupRef}
      visible={visible}
      position={t.position || [0, 0, 0]}
      rotation={t.rotation || [0, 0, 0]}
      scale={t.scale || [1, 1, 1]}
      onClick={(e) => {
        if (!visible) return; // a hidden solid shouldn't intercept selection
        e.stopPropagation();
        if (onSelect) onSelect(featureId, groupRef.current);
      }}
    >
      {heavy ? (
        <LODMesh geometry={geometry} color={color} rotation={[-Math.PI / 2, 0, 0]} />
      ) : (
        <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
          <meshStandardMaterial
            color={color}
            side={THREE.DoubleSide}
            metalness={0.3}
            roughness={0.6}
          />
        </mesh>
      )}
    </group>
  );
};

// Sketch wireframe preview in 3D
const SketchPreview = ({ sketch, height = 0 }) => {
  if (!sketch) return null;

  const geometry = React.useMemo(() => {
    // Use shared geometry utility to get points (includes arc sampling)
    const points = sampleSketchPoints(sketch).map(p => new THREE.Vector3(p.x * 3, height, -p.y * 3));
    if (points.length > 2) points.push(points[0]); // Close loop

    if (points.length < 2) return null;
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [sketch, height]);

  React.useEffect(() => {
    return () => {
      if (geometry) geometry.dispose();
    };
  }, [geometry]);

  if (!geometry) return null;

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color="#ff9500" linewidth={2} />
    </line>
  );
};

const LoadingSpinner = () => (
  <Html center>
    <div style={{
      padding: '24px 32px',
      background: 'rgba(30, 30, 30, 0.95)',
      borderRadius: '8px',
      textAlign: 'center',
      border: '1px solid rgba(80, 80, 80, 0.5)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
    }}>
      <div style={{
        border: '3px solid #404040',
        borderTop: '3px solid #3b82f6',
        borderRadius: '50%',
        width: '36px',
        height: '36px',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto 12px'
      }} />
      <div style={{ color: '#ccc', fontSize: '13px' }}>Loading...</div>
    </div>
  </Html>
);

// Custom component representing a genuine SolidWorks style triad coordinate indicator
const SolidWorksTriad = ({ axisColors = ['#ff3653', '#3dd957', '#2c7fff'], font = 'bold 28px Inter, Arial, sans-serif' }) => {
  const [colorX, colorY, colorZ] = axisColors;
  const { tweenCamera } = useGizmoContext();
  const { gl } = useThree();

  // Helper component to generate transparent label textures for X, Y, Z
  const AxisLabel = ({ label, color, position }) => {
    const texture = React.useMemo(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, 64, 64);
      context.font = font;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = color;
      context.fillText(label, 32, 32);
      return new THREE.CanvasTexture(canvas);
    }, [label, color]);

    return (
      <sprite position={position} scale={[1.2, 1.2, 1.2]}>
        <spriteMaterial
          map={texture}
          map-anisotropy={gl.capabilities.getMaxAnisotropy() || 1}
          alphaTest={0.3}
          toneMapped={false}
        />
      </sprite>
    );
  };

  // Click handler creator
  const createClickHandler = (dir) => (e) => {
    e.stopPropagation();
    tweenCamera(new THREE.Vector3(...dir));
  };

  // Hover states to style cursor
  const handlePointerOver = (e) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e) => {
    e.stopPropagation();
    document.body.style.cursor = 'auto';
  };

  return (
    <group scale={40}>
      {/* Origin sphere */}
      <mesh>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshBasicMaterial color="#8a99a6" toneMapped={false} />
      </mesh>

      {/* X Axis (Red) */}
      <group
        onClick={createClickHandler([1, 0, 0])}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        {/* Shaft */}
        <mesh position={[0.375, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.015, 0.015, 0.75, 8]} />
          <meshBasicMaterial color={colorX} toneMapped={false} />
        </mesh>
        {/* Arrowhead */}
        <mesh position={[0.8, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.045, 0.15, 12]} />
          <meshBasicMaterial color={colorX} toneMapped={false} />
        </mesh>
        {/* Label */}
        <AxisLabel label="X" color={colorX} position={[1.05, 0, 0]} />
      </group>

      {/* Y Axis (Green) */}
      <group
        onClick={createClickHandler([0, 1, 0])}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        {/* Shaft */}
        <mesh position={[0, 0.375, 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.75, 8]} />
          <meshBasicMaterial color={colorY} toneMapped={false} />
        </mesh>
        {/* Arrowhead */}
        <mesh position={[0, 0.8, 0]} rotation={[0, 0, 0]}>
          <coneGeometry args={[0.045, 0.15, 12]} />
          <meshBasicMaterial color={colorY} toneMapped={false} />
        </mesh>
        {/* Label */}
        <AxisLabel label="Y" color={colorY} position={[0, 1.05, 0]} />
      </group>

      {/* Z Axis (Blue) */}
      <group
        onClick={createClickHandler([0, 0, 1])}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        {/* Shaft */}
        <mesh position={[0, 0, 0.375]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.75, 8]} />
          <meshBasicMaterial color={colorZ} toneMapped={false} />
        </mesh>
        {/* Arrowhead */}
        <mesh position={[0, 0, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.045, 0.15, 12]} />
          <meshBasicMaterial color={colorZ} toneMapped={false} />
        </mesh>
        {/* Label */}
        <AxisLabel label="Z" color={colorZ} position={[0, 0, 1.05]} />
      </group>
    </group>
  );
};


const Scene = ({ cameraRef, orbitRef, navPreset, modelUrl, onModelLoad, onModelCaptured, capturedModels = [], extrudedGeometries, sketches, editMode, editFeature, onGeometryUpdate, selectedFeatureId, onFeatureSelect, onTransformPersist }) => {
  const theme = useSettingsStore((s) => s.theme);
  const getActiveTheme = (themeVal) => {
    if (themeVal === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'dark';
    }
    return themeVal;
  };
  const activeTheme = getActiveTheme(theme);

  const [transformMode, setTransformMode] = useState('translate'); // translate, rotate, scale
  const transformRef = useRef();
  const modelRef = useRef();

  // featureId -> Object3D (the per-solid group the gizmo attaches to). Populated
  // by ExtrudedMesh via registerRef so selection works for created solids, not
  // just the imported GLB.
  const refRegistry = useRef(new Map());
  const [regVersion, setRegVersion] = useState(0);

  const registerRef = useCallback((id, obj) => {
    if (obj) refRegistry.current.set(id, obj);
    else refRegistry.current.delete(id);
    // Bump so the resolve effect re-runs when a ref lands after selection.
    setRegVersion((n) => n + 1);
  }, []);

  // Selection key the gizmo targets: a feature id, the '__model__' sentinel for
  // the imported GLB (which isn't a store feature), or null. Local so it can hold
  // the model selection that the store can't represent; feature selections are
  // mirrored to the store (below) for Feature-Tree highlight + persistence.
  const [selectedId, setSelectedId] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);

  // Mirror external (Feature Tree / store) selection into the local key — but
  // don't clobber a live model selection when the store simply has no feature.
  useEffect(() => {
    setSelectedId((cur) =>
      (cur === '__model__' && !selectedFeatureId) ? cur : (selectedFeatureId || null)
    );
  }, [selectedFeatureId]);

  // Resolve the selection key to an Object3D. Re-runs on regVersion so a ref that
  // registers a frame after selection (e.g. a just-added auto-selected primitive)
  // still attaches the gizmo.
  useEffect(() => {
    if (!selectedId) { setSelectedObject(null); return; }
    const obj = selectedId === '__model__'
      ? modelRef.current
      : refRegistry.current.get(selectedId);
    setSelectedObject(obj || null);
    if (obj) invalidate(); // demand-mode: show the gizmo immediately
  }, [selectedId, regVersion]);

  // Select a feature (mirrors to the store) or the GLB model (clears the store
  // feature selection, keeps the gizmo locally).
  const selectFeature = useCallback((id) => {
    if (id === '__model__') {
      setSelectedId('__model__');
      onFeatureSelect?.(null);
    } else {
      setSelectedId(id || null);
      onFeatureSelect?.(id || null);
    }
  }, [onFeatureSelect]);

  // Disable orbit controls while dragging the gizmo, and persist the resulting
  // transform on drag-release so it survives undo/save/reload. Depends on
  // selectedObject so it (re)attaches AFTER the gizmo mounts — refs are assigned
  // during commit, before effects run, so transformRef.current is valid here.
  useEffect(() => {
    const tc = transformRef.current;
    if (!tc) return;

    const onDraggingChanged = (event) => {
      if (orbitRef?.current) orbitRef.current.enabled = !event.value;
      // Persist on release (value -> false) for real feature solids (not the GLB).
      if (!event.value && selectedId && selectedId !== '__model__' && onTransformPersist) {
        const obj = refRegistry.current.get(selectedId);
        if (obj) {
          onTransformPersist(selectedId, {
            position: [obj.position.x, obj.position.y, obj.position.z],
            rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
            scale: [obj.scale.x, obj.scale.y, obj.scale.z],
          });
        }
      }
    };

    tc.addEventListener('dragging-changed', onDraggingChanged);
    return () => tc.removeEventListener('dragging-changed', onDraggingChanged);
  }, [selectedObject, selectedId, orbitRef, onTransformPersist]);

  // W/E/R key switching for transform mode; ESC deselects.
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'w' && !e.ctrlKey) setTransformMode('translate');
      if (e.key === 'e' && !e.ctrlKey) setTransformMode('rotate');
      if (e.key === 'r' && !e.ctrlKey) setTransformMode('scale');
      if (e.key === 'Escape') selectFeature(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectFeature]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-10, -10, -10]} intensity={0.3} />
      <CameraController ref={cameraRef} orbitRef={orbitRef} navPreset={navPreset} />
      <WorkPlane />

      {/* Empty-space clicks deselect via the Canvas onPointerMissed handler
          (wired in ThreeViewer) — an invisible plane can't, three.js skips
          raycasting objects with visible=false. */}

      {/* Active (uncaptured) external model — clears once captured */}
      {modelUrl && (
        <Suspense fallback={<LoadingSpinner />}>
          <LoadedModel
            ref={modelRef}
            url={modelUrl}
            onLoad={onModelLoad}
            onModelCaptured={(meshData) => onModelCaptured?.(meshData, modelUrl)}
            onClick={() => selectFeature('__model__')}
          />
        </Suspense>
      )}

      {/* Per-capture LoadedModels — each renders its own GLB with full materials */}
      {capturedModels.map((f) => (
        <Suspense key={f.id} fallback={null}>
          <LoadedModel
            url={f.glbUrl}
            onLoad={null}
            onModelCaptured={null}
            onClick={() => selectFeature(f.id)}
            transform={f.transform}
            featureId={f.id}
            registerRef={registerRef}
          />
        </Suspense>
      ))}

      {/* TransformControls gizmo — attached to selected object */}
      {selectedObject && !editMode && (
        <TransformControls
          ref={transformRef}
          object={selectedObject}
          mode={transformMode}
          size={0.8}
          onObjectChange={() => invalidate()}
        />
      )}

      {/* Extruded geometries from OpenCascade */}
      {!editMode && extrudedGeometries.map((geo, i) => (
        <ExtrudedMesh
          key={geo.id || i}
          featureId={geo.id}
          meshData={geo.meshData}
          color={geo.color || '#4ecdc4'}
          transform={geo.transform}
          visible={geo.visible}
          registerRef={registerRef}
          onSelect={(id) => selectFeature(id)}
        />
      ))}

      {/* Assembly instances (one InstancedMesh per part) */}
      {!editMode && <InstancedParts />}

      {/* Mesh Editor for vertex-level editing */}
      {editMode && editFeature ? (
        <MeshEditor 
          feature={editFeature} 
          onGeometryUpdate={onGeometryUpdate}
          orbitRef={orbitRef}
        />
      ) : editMode ? (
        <Html center>
          <div style={{
            padding: '20px',
            background: 'rgba(255, 0, 0, 0.8)',
            color: 'white',
            borderRadius: '8px'
          }}>
            No feature selected for editing
          </div>
        </Html>
      ) : null}

      {/* Sketch previews (wireframes) */}
      {sketches?.filter(s => !s.extruded).map((sketch, i) => (
        <SketchPreview key={sketch.id || i} sketch={sketch} />
      ))}

      {/* Interactive navigation gizmo, fixed screen-space overlay. Because
          OrbitControls has makeDefault, GizmoHelper auto-tweens the camera on
          click and the widget always reflects the live camera orientation.
          Widget + placement come from the navigation preset:
            - 'viewport' (SolidWorks Reference Triad / Blender gizmo, bottom-left):
              clickable axis triad — click X/Y/Z to look normal to that axis
              (Right/Top/Front); the negative arrows give the opposite views.
            - 'cube' (Default, top-right): a labeled ViewCube with clickable faces
              (Front/Top/Right), edges (2-axis), and corners (isometric). */}
      <GizmoHelper alignment={navPreset.gizmoAlignment} margin={[80, 80]}>
        {navPreset.gizmo === 'cube' ? (
          <GizmoViewcube {...navPreset.cubeTheme} />
        ) : navPreset.gizmo === 'solidworks' ? (
          <SolidWorksTriad axisColors={navPreset.axisColors} />
        ) : (
          <GizmoViewport
            axisColors={navPreset.axisColors}
            labelColor={activeTheme === 'light' ? '#000000' : '#ffffff'}
          />
        )}
      </GizmoHelper>
 
      {/* Transform mode indicator overlay */}
      {selectedObject && (
        <Html position={[0, 0, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{
            position: 'fixed',
            bottom: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: activeTheme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(20, 20, 20, 0.95)',
            padding: '8px 18px',
            borderRadius: '8px',
            border: activeTheme === 'light' ? '1px solid rgba(200, 200, 200, 0.8)' : '1px solid rgba(100, 100, 100, 0.5)',
            fontSize: '12px',
            color: activeTheme === 'light' ? '#000000' : '#ffffff',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            pointerEvents: 'auto',
            userSelect: 'none',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ color: activeTheme === 'light' ? '#555555' : '#888888' }}>Mode:</span>
            <span style={{
              color: transformMode === 'translate' ? (activeTheme === 'light' ? '#000000' : '#ffffff') : (activeTheme === 'light' ? '#555555' : '#888888'),
              fontWeight: transformMode === 'translate' ? '700' : '400',
              cursor: 'pointer'
            }} onClick={() => setTransformMode('translate')}>
              [W] Move
            </span>
            <span style={{
              color: transformMode === 'rotate' ? (activeTheme === 'light' ? '#000000' : '#ffffff') : (activeTheme === 'light' ? '#555555' : '#888888'),
              fontWeight: transformMode === 'rotate' ? '700' : '400',
              cursor: 'pointer'
            }} onClick={() => setTransformMode('rotate')}>
              [E] Rotate
            </span>
            <span style={{
              color: transformMode === 'scale' ? (activeTheme === 'light' ? '#000000' : '#ffffff') : (activeTheme === 'light' ? '#555555' : '#888888'),
              fontWeight: transformMode === 'scale' ? '700' : '400',
              cursor: 'pointer'
            }} onClick={() => setTransformMode('scale')}>
              [R] Scale
            </span>
            <span style={{ color: activeTheme === 'light' ? '#777777' : '#666666', marginLeft: '8px' }}>ESC: Deselect</span>
          </div>
        </Html>
      )}
    </>
  );
};

const ThreeViewer = forwardRef((props, ref) => {
  const cameraRef = useRef();
  const orbitRef = useRef();
  const [cadReady, setCadReady] = useState(false);

  const { sketches = [], features = [], modelUrl, onModelLoad, onModelCaptured, editMode, editFeature, onGeometryUpdate, selectedFeature, onFeatureSelect, onTransformPersist } = props;

  // Get 3D solids from features (extruded via sidebar + Torquy AI primitives).
  // Excludes:
  //  'ai-model'          - active uncaptured GLB, shown by the modelUrl <LoadedModel> below
  //  'ai-model-captured' - captured GLBs, each rendered by their own <LoadedModel> via glbUrl
  // Includes:
  //  'ai-model-copy'     - paste clones have no GLB URL, render via flat-colored meshData
  const featureSolids = React.useMemo(() => {
    return features
      .filter(f =>
        f.type === '3d-solid' &&
        f.meshData &&
        f.source !== 'ai-model' &&
        f.source !== 'ai-model-captured' &&
        !(f.source === 'imported-model' && f.glbUrl)
      )
      .map(f => ({
        id: f.id,
        meshData: f.meshData,
        color: f.color || '#4ecdc4',
        name: f.name,
        transform: f.transform,
        visible: f.visible !== false,
      }));
  }, [features]);

  // Captured Image-to-3D models / Imported models — rendered with full material fidelity via
  // their own <LoadedModel> (one per feature). This replaces the old single-
  // modelUrl approach and allows multiple captured models to coexist.
  const capturedModels = React.useMemo(() => {
    return features.filter(f => (f.source === 'ai-model-captured' || f.source === 'imported-model') && f.glbUrl && f.visible !== false);
  }, [features]);

  // Adaptive quality (clamped dpr/shadows/antialias on low-end devices)
  const quality = useAdaptiveQuality();

  // Active navigation preset and theme. Subscribed to settings store.
  const navStyle = useSettingsStore((s) => s.navStyle);
  const theme = useSettingsStore((s) => s.theme);
  const navPreset = getNavPreset(navStyle);

  const getActiveTheme = (themeVal) => {
    if (themeVal === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'dark';
    }
    return themeVal;
  };
  const activeTheme = getActiveTheme(theme);

  // Render-on-demand by default; escape hatch via localStorage for debugging.
  // While an object is selected we render continuously so the TransformControls
  // gizmo appears instantly and drags smoothly (demand mode only renders on
  // invalidate, which makes the gizmo feel unresponsive). Back to demand on
  // deselect to keep idle GPU at ~0 on low-end devices.
  const alwaysFlag = typeof window !== 'undefined' && window.localStorage?.getItem('ct_cad_always') === '1';
  const frameloop = (alwaysFlag || selectedFeature) ? 'always' : 'demand';

  // Initialize CAD service
  useEffect(() => {
    cadClient.init().then(() => setCadReady(true)).catch(() => { });
  }, []);

  // Request a render whenever scene-affecting inputs change (needed under frameloop="demand")
  useEffect(() => {
    invalidate();
  }, [featureSolids, sketches, modelUrl, editMode, editFeature]);

  useImperativeHandle(ref, () => ({
    fitToScreen: () => cameraRef.current?.fitToScreen(),
    setFrontView: () => cameraRef.current?.setFrontView(),
    setTopView: () => cameraRef.current?.setTopView(),
    setRightView: () => cameraRef.current?.setRightView(),
    setIsoView: () => cameraRef.current?.setIsoView(),
    zoomIn: () => cameraRef.current?.zoomIn(),
    zoomOut: () => cameraRef.current?.zoomOut(),
  }));

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <RendererProvider
        frameloop={frameloop}
        quality={quality}
        background={
          activeTheme === 'light'
            ? 'linear-gradient(to bottom, #b4c5d6 0%, #ffffff 100%)'
            : 'linear-gradient(to bottom, #18181b 0%, #09090b 100%)'
        }
        onPointerMissed={() => onFeatureSelect?.(null)}
      >
        <Suspense fallback={<LoadingSpinner />}>
          <Scene
            cameraRef={cameraRef}
            orbitRef={orbitRef}
            navPreset={navPreset}
            modelUrl={modelUrl}
            onModelLoad={onModelLoad}
            onModelCaptured={onModelCaptured}
            capturedModels={capturedModels}
            extrudedGeometries={featureSolids}
            sketches={sketches}
            editMode={editMode}
            editFeature={editFeature}
            onGeometryUpdate={onGeometryUpdate}
            selectedFeatureId={selectedFeature?.id ?? null}
            onFeatureSelect={(id) => onFeatureSelect?.(id ? { id } : null)}
            onTransformPersist={onTransformPersist}
          />
        </Suspense>
        <StatsSampler />
        <AdaptiveDpr pixelated={false} />
        <AdaptiveEvents />
      </RendererProvider>


      {/* Extrusion is handled via sidebar CADOperations */}
      {/* Geometry counter (bottom-right — keeps the bottom-left clear for the
          SolidWorks/Blender navigation triad). */}
      {featureSolids.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          background: activeTheme === 'light' ? 'rgba(255, 255, 255, 0.92)' : 'rgba(0, 0, 0, 0.7)',
          color: activeTheme === 'light' ? '#09090b' : 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          border: activeTheme === 'light' ? '1px solid rgba(200, 200, 200, 0.8)' : 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          3D Objects: {featureSolids.length}
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
});

export default ThreeViewer;