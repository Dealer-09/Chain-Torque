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

// Try the worker; on any failure, permanently switch to the main-thread implementation
// so the editor keeps working instead of breaking.
async function run(workerCall, mainCall) {
  if (mode === 'main' || forceMain()) return mainCall();
  try {
    const result = await workerCall(getWorkerApi());
    mode = 'worker';
    return result;
  } catch (err) {
    console.warn('[cadClient] Worker path failed — falling back to main thread:', err?.message || err);
    mode = 'main';
    dropWorker();
    return mainCall();
  }
}

export const cadClient = {
  isWorkerActive: () => mode === 'worker',

  init: () => run((api) => api.init(), () => ops.initKernel()),

  extrudeToMesh: (points, height, options) =>
    run((api) => api.extrudeToMesh(points, height, options), () => ops.extrudeToMesh(points, height, options)),

  primitiveToMesh: (type, params, position) =>
    run((api) => api.primitiveToMesh(type, params, position), () => ops.primitiveToMesh(type, params, position)),

  meshBoolean: (a, b, op) =>
    run((api) => api.meshBoolean(a, b, op), () => ops.meshBoolean(a, b, op)),

  buildAIModel: (shapes, booleanOps) =>
    run((api) => api.buildAIModel(shapes, booleanOps), () => ops.buildAIModel(shapes, booleanOps)),
};

export default cadClient;
