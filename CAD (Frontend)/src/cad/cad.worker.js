// Web Worker: runs the OpenCascade WASM kernel off the main thread so tessellation
// and CSG never freeze the UI. Exposes the mesh-in/mesh-out ops via Comlink, returning
// mesh buffers as Transferables (zero-copy) where possible.
import * as Comlink from 'comlink';
import * as ops from './cadOperations';

const transferMesh = (mesh) => {
  if (mesh && mesh.vertices && mesh.indices && mesh.normals) {
    return Comlink.transfer(mesh, [mesh.vertices.buffer, mesh.indices.buffer, mesh.normals.buffer]);
  }
  return mesh;
};

const api = {
  init: () => ops.initKernel(),

  extrudeToMesh: async (points, height, options) =>
    transferMesh(await ops.extrudeToMesh(points, height, options)),

  primitiveToMesh: async (type, params, position) =>
    transferMesh(await ops.primitiveToMesh(type, params, position)),

  meshBoolean: async (a, b, op) =>
    transferMesh(await ops.meshBoolean(a, b, op)),

  buildAIModel: async (shapes, booleanOps) => {
    const features = await ops.buildAIModel(shapes, booleanOps);
    const transfers = [];
    for (const f of features) {
      if (f.meshData) {
        transfers.push(f.meshData.vertices.buffer, f.meshData.indices.buffer, f.meshData.normals.buffer);
      }
    }
    return Comlink.transfer(features, transfers);
  },
};

Comlink.expose(api);
