// OpenCascade.js CAD Kernel Loader
// Handles lazy loading and initialization of the WASM module

let ocInstance = null;
let loadingPromise = null;

/**
 * Load and initialize OpenCascade.js
 * @returns {Promise} Resolves with the OpenCascade instance
 */
export async function initOpenCascade() {
    if (ocInstance) return ocInstance;
    if (loadingPromise) return loadingPromise;

    loadingPromise = new Promise(async (resolve, reject) => {
        try {
            const opencascadeModule = await import('opencascade.js');
            const initOC = opencascadeModule.initOpenCascade || opencascadeModule.default;

            if (typeof initOC !== 'function') {
                throw new Error('OpenCascade initialization function not found');
            }

            const oc = await initOC();
            ocInstance = oc;
            resolve(oc);
        } catch (error) {
            loadingPromise = null;
            reject(error);
        }
    });

    return loadingPromise;
}

/**
 * Get the OpenCascade instance (must be initialized first)
 */
export function getOC() {
    if (!ocInstance) {
        throw new Error('OpenCascade not initialized. Call initOpenCascade() first.');
    }
    return ocInstance;
}

/**
 * Check if OpenCascade is loaded
 */
export function isOCLoaded() {
    return ocInstance !== null;
}

export default { initOpenCascade, getOC, isOCLoaded };
