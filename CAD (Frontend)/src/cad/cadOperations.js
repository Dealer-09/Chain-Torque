// High-level, mesh-in / mesh-out CAD operations.
// Used by BOTH the Web Worker (cad.worker.js) and the main-thread fallback
// (cadClient.js). Critically, OpenCascade BREP handles (TopoDS_Shape) never leave
// this module — every public function returns plain { vertices, indices, normals }
// typed arrays, which are safe to transfer across a worker boundary.
import cadGeometryService from './CADGeometryService';

const del = (shape) => {
  if (shape && typeof shape.delete === 'function') {
    try { shape.delete(); } catch { /* noop */ }
  }
};

export async function initKernel() {
  await cadGeometryService.init();
  return true;
}

export async function extrudeToMesh(points, height, options = {}) {
  await cadGeometryService.init();
  let shape = null;
  try {
    shape = cadGeometryService.extrudeProfile(points, height, options);
    return cadGeometryService.shapeToMesh(shape);
  } finally {
    del(shape);
  }
}

export async function primitiveToMesh(type, params = {}, position = { x: 0, y: 0, z: 0 }) {
  await cadGeometryService.init();
  let shape = null;
  try {
    switch (type) {
      case 'sphere':
        shape = cadGeometryService.createSphere(params.radius ?? 5, position);
        break;
      case 'cylinder':
        shape = cadGeometryService.createCylinder(params.radius ?? params.radiusTop ?? 5, params.height ?? 10, position);
        break;
      case 'cone':
        shape = cadGeometryService.createCone(
          params.radiusBottom ?? params.radius ?? 5,
          params.radiusTop ?? 0,
          params.height ?? 10,
          position
        );
        break;
      case 'cube':
      case 'plane':
      default:
        shape = cadGeometryService.createBox(params.width ?? 10, params.height ?? 10, params.depth ?? 10, position);
    }
    return cadGeometryService.shapeToMesh(shape);
  } finally {
    del(shape);
  }
}

export async function meshBoolean(meshData1, meshData2, operation) {
  await cadGeometryService.init();
  // meshBooleanOperation is already mesh-in/mesh-out and disposes its own BREP shapes.
  return cadGeometryService.meshBooleanOperation(meshData1, meshData2, operation);
}

/**
 * Full AI (Torquy) CSG pipeline: instantiate primitives, apply boolean operations,
 * then mesh the survivors. Returns ready-to-use feature objects. Runs entirely off
 * the main thread when invoked via the worker.
 */
export async function buildAIModel(shapes = [], booleanOps = []) {
  await cadGeometryService.init();
  const shapeMap = new Map();

  for (let i = 0; i < shapes.length; i++) {
    const shapeDef = shapes[i];
    const p = shapeDef.parameters || {};
    const pos = shapeDef.position || { x: 0, y: 0, z: 0 };
    let ocShape = null;
    try {
      switch (shapeDef.type) {
        case 'sphere':
          ocShape = cadGeometryService.createSphere(p.radius || 10, pos);
          break;
        case 'cylinder':
          ocShape = cadGeometryService.createCylinder(p.radius || p.radiusTop || 5, p.height || 10, pos);
          break;
        case 'cone':
          ocShape = cadGeometryService.createCone(p.radiusBottom || p.radius || 5, p.radiusTop || 0, p.height || 10, pos);
          break;
        case 'cube':
        case 'plane':
        default:
          ocShape = cadGeometryService.createBox(p.width || 10, p.height || 10, p.depth || 10, pos);
      }
      shapeMap.set(shapeDef.id || `shape_${i}`, { ocShape, def: shapeDef, isConsumed: false });
    } catch {
      /* skip shapes that fail to instantiate */
    }
  }

  for (const op of booleanOps) {
    const base = shapeMap.get(op.baseShapeId);
    const tool = shapeMap.get(op.toolShapeId);
    if (!base || !tool || base.isConsumed || tool.isConsumed) continue;
    try {
      let result = null;
      if (op.type === 'subtract' || op.type === 'cut') result = cadGeometryService.booleanCut(base.ocShape, tool.ocShape);
      else if (op.type === 'union') result = cadGeometryService.booleanUnion(base.ocShape, tool.ocShape);
      else if (op.type === 'intersect') result = cadGeometryService.booleanIntersect(base.ocShape, tool.ocShape);
      if (result) {
        del(base.ocShape);      // free the previous base; result becomes the new base
        base.ocShape = result;
        tool.isConsumed = true; // tool handle freed in the final cleanup pass
      }
    } catch {
      /* skip failed boolean op */
    }
  }

  const features = [];
  let idx = 0;
  for (const [, item] of shapeMap.entries()) {
    if (!item.isConsumed) {
      try {
        const meshData = cadGeometryService.shapeToMesh(item.ocShape);
        features.push({
          id: `torquy_csg_${Date.now()}_${idx++}`,
          type: '3d-solid',
          name: `Engineered ${item.def.type}`,
          source: 'torquy-csg',
          meshData,
          color: item.def.color || '#4ecdc4',
          visible: true,
        });
      } catch {
        /* skip shapes that fail to mesh */
      }
    }
  }

  // Free every remaining BREP handle (survivors already meshed, tools consumed).
  for (const [, item] of shapeMap.entries()) del(item.ocShape);

  return features;
}
