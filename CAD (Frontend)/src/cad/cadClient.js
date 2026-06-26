// Main-thread facade for the CAD kernel. Prefers the Web Worker (cad.worker.js) so
// heavy WASM work stays off the UI thread, but transparently falls back to running the
// same operations on the main thread if the worker fails to start or errors out (e.g.
// a browser/WASM-in-worker quirk). Either way the public API is identical and async.
//
// Force main-thread mode for debugging with localStorage 'ct_cad_noworker' = '1'.
import * as Comlink from 'comlink';
import * as ops from './cadOperations';

let mode = 'auto'; // 'auto' | 'worker' | 'main'
let worker = null;
let workerApi = null;

function forceMain() {
  try {
    return typeof window !== 'undefined' && window.localStorage?.getItem('ct_cad_noworker') === '1';
  } catch {
    return false;
  }
}

function getWorkerApi() {
  if (workerApi) return workerApi;
  worker = new Worker(new URL('./cad.worker.js', import.meta.url), { type: 'module' });
  workerApi = Comlink.wrap(worker);
  return workerApi;
}

function dropWorker() {
  try { worker?.terminate(); } catch { /* noop */ }
  worker = null;
  workerApi = null;
}

export const cadClient = {
  isWorkerActive: () => mode === 'worker',

  init: async () => {
    if (forceMain()) {
      mode = 'main';
      return ops.initKernel();
    }
    try {
      await getWorkerApi().init();
      mode = 'worker';
    } catch (err) {
      console.warn('[cadClient] Worker init failed — falling back to main thread:', err?.message || err);
      mode = 'main';
      dropWorker();
      return ops.initKernel();
    }
  },

  extrudeToMesh: (points, height, options) =>
    mode === 'main' ? ops.extrudeToMesh(points, height, options) : getWorkerApi().extrudeToMesh(points, height, options),

  primitiveToMesh: (type, params, position) =>
    mode === 'main' ? ops.primitiveToMesh(type, params, position) : getWorkerApi().primitiveToMesh(type, params, position),

  meshBoolean: (a, b, op) =>
    mode === 'main' ? ops.meshBoolean(a, b, op) : getWorkerApi().meshBoolean(a, b, op),

  buildAIModel: (shapes, booleanOps) =>
    mode === 'main' ? ops.buildAIModel(shapes, booleanOps) : getWorkerApi().buildAIModel(shapes, booleanOps),
};

export default cadClient;
