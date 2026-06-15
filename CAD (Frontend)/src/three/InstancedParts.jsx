// src/three/InstancedParts.jsx
// Renders assembly instances. Every instance of a part shares one merged
// geometry drawn via an InstancedMesh (drei <Instances>), so an assembly of N
// repeated parts costs ~1 draw call per distinct part instead of N.
//
// Reads parts/instances straight from the document store (it lives inside the
// R3F <Canvas>, so the zustand hook works normally) — no prop threading.

import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Instances, Instance } from '@react-three/drei';
import { useDocumentStore } from '../store/documentStore';
import { buildPartGeometry } from './partGeometry';
import { disposeBoundsTreeSafe } from './culling';

function PartInstances({ part, instances }) {
  const geometry = useMemo(() => buildPartGeometry(part), [part]);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: part.color || '#4ecdc4',
        side: THREE.DoubleSide,
        metalness: 0.3,
        roughness: 0.6,
      }),
    [part.color]
  );

  useEffect(() => {
    return () => {
      if (geometry) {
        disposeBoundsTreeSafe(geometry);
        geometry.dispose();
      }
    };
  }, [geometry]);

  useEffect(() => () => material.dispose(), [material]);

  if (!geometry || instances.length === 0) return null;

  return (
    <Instances geometry={geometry} material={material} limit={Math.max(1, instances.length)} range={instances.length}>
      {instances.map((inst) => (
        <Instance
          key={inst.id}
          position={inst.transform?.position || [0, 0, 0]}
          rotation={inst.transform?.rotation || [0, 0, 0]}
          scale={inst.transform?.scale ?? 1}
          color={inst.color || part.color || '#4ecdc4'}
        />
      ))}
    </Instances>
  );
}

export default function InstancedParts() {
  const parts = useDocumentStore((s) => s.parts);
  const instances = useDocumentStore((s) => s.instances);

  // Group instances by their part once per change.
  const byPart = useMemo(() => {
    const map = new Map();
    for (const inst of instances) {
      if (!map.has(inst.partId)) map.set(inst.partId, []);
      map.get(inst.partId).push(inst);
    }
    return map;
  }, [instances]);

  if (!parts.length || !instances.length) return null;

  return (
    <>
      {parts.map((part) => {
        const partInstances = byPart.get(part.id);
        if (!partInstances?.length) return null;
        return <PartInstances key={part.id} part={part} instances={partInstances} />;
      })}
    </>
  );
}
