# Mesh Vertex Editing - Implementation Guide

## Overview

The ChainTorque CAD Editor now supports **vertex-level mesh editing** for 3D models. This feature allows users to select and drag individual vertices to modify the shape of CAD primitives and AI-generated models.

## Architecture

### Key Components

1. **MeshEditor.jsx** - The main vertex editing component
2. **ThreeViewer.jsx** - 3D viewport that renders MeshEditor in edit mode
3. **App.jsx** - Manages edit mode state and feature selection

### How It Works

```
User clicks "Edit" button
    ↓
App.jsx: Sets editMode=true and selects feature with meshData
    ↓
ThreeViewer: Renders MeshEditor with selected feature
    ↓
MeshEditor: Displays mesh with vertices as visible points
    ↓
User clicks a vertex point
    ↓
MeshEditor: Creates green helper sphere at vertex + TransformControls gizmo
    ↓
User drags gizmo arrow
    ↓
TransformControls: Moves helper sphere
    ↓
useFrame hook: Continuously syncs vertex position from helper sphere
    ↓
BufferGeometry: Updates in real-time with needsUpdate=true
    ↓
User releases gizmo
    ↓
dragging-changed event: Notifies parent component of final geometry
```

## Implementation Details

### Vertex Selection

```javascript
// Raycasting to detect clicked vertex
raycaster.params.Points.threshold = 0.3; // Important for point selection!
raycaster.setFromCamera(pointer, camera);
const intersects = raycaster.intersectObject(pointsRef.current);
```

### Real-Time Updates

The key innovation is using `useFrame` instead of event callbacks:

```javascript
useFrame(() => {
  if (!vertexHelper || selectedVertexIndex === null) return;
  
  const newPos = vertexHelper.position;
  
  // Skip if no position change
  if (Math.abs(newPos.x - lastHelperPosition.current.x) < 0.0001) return;
  
  // Update vertex in Float32Array
  verticesRef.current[index * 3] = newPos.x;
  verticesRef.current[index * 3 + 1] = newPos.y;
  verticesRef.current[index * 3 + 2] = newPos.z;
  
  // Trigger geometry update
  meshGeometryRef.current.attributes.position.needsUpdate = true;
  meshGeometryRef.current.computeVertexNormals();
});
```

### Why useFrame Instead of Callbacks?

**Problem with onChange/onObjectChange:**
- These callbacks don't always fire reliably in @react-three/drei
- They require specific event handling that differs between versions
- The helper sphere moves, but the vertex array wasn't updating

**Solution with useFrame:**
- Runs every animation frame (60 FPS)
- Continuously monitors helper sphere position
- Only updates geometry when position actually changes
- Simple and reliable approach

### OrbitControls Management

```javascript
// Disable camera rotation while dragging vertex
tc.addEventListener('dragging-changed', (event) => {
  if (orbitRef?.current) {
    orbitRef.current.enabled = !event.value;
  }
});
```

### Geometry Rotation

CAD primitives are rotated -90° on X-axis to match the editor's coordinate system:

```javascript
<group rotation={[-Math.PI / 2, 0, 0]}>
  <mesh>...</mesh>
  <points>...</points>
</group>
```

## User Workflow

### Basic Usage

1. **Create a 3D object**:
   - Draw a shape in 2D mode and extrude it, OR
   - Generate an AI model using the Image-to-3D tool

2. **Enter Edit Mode**:
   - Click the **"Edit"** button (next to 2D/3D toggle)
   - The selected feature's mesh will appear with visible white vertices

3. **Select a Vertex**:
   - Click on any **white dot** (vertex point)
   - It turns **green** with transform gizmo arrows

4. **Move the Vertex**:
   - **Drag the red/green/blue arrows** on the gizmo
   - The mesh updates in real-time as you drag
   - **Release** to finalize the movement

5. **Select Another Vertex**:
   - Click a different white dot to select it
   - Previous selection is cleared automatically

6. **Exit Edit Mode**:
   - Click **"Edit"** button again or switch to **2D/3D** mode

### Keyboard Shortcuts

- **W** - Translate mode (default in edit mode)
- **E** - Rotate mode (available in normal 3D mode)
- **R** - Scale mode (available in normal 3D mode)
- **ESC** - Deselect current object

## Technical Challenges Solved

### Challenge 1: TransformControls Not Updating Geometry

**Problem**: The gizmo appeared and could be dragged, but the mesh vertices didn't move.

**Root Cause**: The `onChange` and `onObjectChange` callbacks weren't firing consistently.

**Solution**: Switched to `useFrame` hook that continuously monitors the helper sphere's position and updates the geometry on every frame when position changes.

### Challenge 2: Mesh Not Visible in Edit Mode

**Problem**: When entering edit mode, the mesh disappeared.

**Root Cause**: Missing rotation transform - CAD primitives need -90° X rotation to match the editor's coordinate system.

**Solution**: Added `rotation={[-Math.PI / 2, 0, 0]}` to the root group in MeshEditor.

### Challenge 3: Camera Orbiting While Dragging

**Problem**: Dragging the vertex gizmo also rotated the camera view.

**Root Cause**: OrbitControls remained enabled during TransformControls interaction.

**Solution**: Listen to `dragging-changed` event and disable OrbitControls while dragging:

```javascript
tc.addEventListener('dragging-changed', (event) => {
  orbitRef.current.enabled = !event.value; // Disable on drag, enable on release
});
```

### Challenge 4: Vertex Points Not Clickable

**Problem**: Clicking on vertices didn't select them.

**Root Cause**: Raycaster threshold for Points geometry was too small.

**Solution**: Added `raycaster.params.Points.threshold = 0.3;` before raycasting.

## Performance Considerations

- **useFrame** hook runs every frame (60 FPS) but only updates geometry when position changes
- Position change detection uses 0.0001 epsilon to avoid floating-point precision issues
- `computeVertexNormals()` is called on geometry update for proper lighting
- Parent component is only notified when dragging stops (not on every frame)

## Limitations

### Current Limitations

1. **One vertex at a time** - Cannot select and move multiple vertices simultaneously
2. **No multi-select** - Cannot select a region of vertices
3. **No vertex snapping** - Vertices don't snap to grid or other vertices
4. **No undo/redo** - Vertex movements are immediately committed
5. **Complex meshes** - AI models with >10,000 vertices may have performance issues

### Future Enhancements

- [ ] Multi-vertex selection (box select, paint select)
- [ ] Vertex snapping to grid/vertices
- [ ] Edge and face selection modes
- [ ] Extrude faces/edges
- [ ] Subdivision surface modifier
- [ ] Mesh smoothing/decimation
- [ ] Undo/redo system
- [ ] Keyboard shortcuts for precise movement

## Code Reference

### Key Files

- `CAD (Frontend)/src/components/MeshEditor.jsx` - Main vertex editing logic
- `CAD (Frontend)/src/components/ThreeViewer.jsx` - 3D viewport integration
- `CAD (Frontend)/src/App.jsx` - Edit mode state management

### Key Props

**MeshEditor Component:**
```javascript
<MeshEditor 
  feature={editFeature}           // Feature with meshData
  onGeometryUpdate={callback}     // Called when vertex movement completes
  orbitRef={orbitRef}             // Ref to OrbitControls
/>
```

**Feature Structure:**
```javascript
{
  id: string,
  name: string,
  type: '3d-solid' | 'ai-model',
  meshData: {
    vertices: Float32Array,  // XYZ positions [x1, y1, z1, x2, y2, z2, ...]
    indices: Uint32Array     // Triangle indices [0, 1, 2, 3, 4, 5, ...]
  },
  visible: boolean,
  color: string
}
```

## Debugging

### Console Logs

The MeshEditor component outputs detailed logs:

```
Edit button clicked. Current state: {...}
MeshEditor rendering: { vertexCount: 8, indexCount: 36, ... }
TransformControls ready
Raycasting: 1 intersections found
Selected vertex 5: (2.50, 2.50, 2.50)
Dragging changed: true
useFrame: Vertex 5 moved to (3.25, 2.50, 2.50)
useFrame: Vertex 5 moved to (3.50, 2.50, 2.50)
Dragging changed: false
Notified parent of final geometry update
```

### Common Issues

**"No feature selected for editing"** (red box)
- Feature doesn't have `meshData` property
- Feature's `visible` property is false
- No features exist in the editor

**Vertices not visible**
- Check point size (currently 0.4)
- Verify `verticesRef.current` is populated
- Check camera distance/position

**Gizmo appears but vertex doesn't move**
- Check console for "useFrame: Vertex X moved" logs
- Verify `needsUpdate = true` is being set
- Check if `meshGeometryRef.current` exists

## References

- [Three.js BufferGeometry](https://threejs.org/docs/#api/en/core/BufferGeometry)
- [@react-three/drei TransformControls](https://github.com/pmndrs/drei#transformcontrols)
- [@react-three/fiber useFrame](https://docs.pmnd.rs/react-three-fiber/api/hooks#useframe)
- [Three.js Raycaster](https://threejs.org/docs/#api/en/core/Raycaster)

---

**Last Updated**: March 2026  
**Author**: ChainTorque Development Team
