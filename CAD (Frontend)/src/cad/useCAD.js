// src/cad/useCAD.js
// React hook for using the CAD kernel via cadClient (worker-backed, main-thread fallback).
// All operations are async and return Three.js BufferGeometry built from mesh data,
// so no OpenCascade BREP handles ever touch React/component code.

import { useState, useEffect, useCallback } from 'react';
import cadClient from './cadClient';
import * as THREE from 'three';

function meshToGeometry(meshData) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(meshData.vertices, 3));
    geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
    if (meshData.normals && meshData.normals.length === meshData.vertices.length) {
        geometry.setAttribute('normal', new THREE.BufferAttribute(meshData.normals, 3));
    } else {
        geometry.computeVertexNormals();
    }
    return geometry;
}

/**
 * React hook for CAD operations. Provides loading state and async geometry builders.
 */
export function useCAD() {
    const [isLoading, setIsLoading] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState(null);
    const [loadProgress, setLoadProgress] = useState(0);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setIsLoading(true);
                setLoadProgress(10);
                await cadClient.init();
                if (mounted) {
                    setLoadProgress(100);
                    setIsReady(true);
                    setIsLoading(false);
                }
            } catch (err) {
                if (mounted) {
                    setError(err.message);
                    setIsLoading(false);
                }
            }
        })();
        return () => { mounted = false; };
    }, []);

    const createBox = useCallback(async (width, height, depth, position) => {
        const mesh = await cadClient.primitiveToMesh('cube', { width, height, depth }, position);
        return meshToGeometry(mesh);
    }, []);

    const createCylinder = useCallback(async (radius, height, position) => {
        const mesh = await cadClient.primitiveToMesh('cylinder', { radius, height }, position);
        return meshToGeometry(mesh);
    }, []);

    const createSphere = useCallback(async (radius, position) => {
        const mesh = await cadClient.primitiveToMesh('sphere', { radius }, position);
        return meshToGeometry(mesh);
    }, []);

    const extrudeProfile = useCallback(async (points, height, options) => {
        const mesh = await cadClient.extrudeToMesh(points, height, options);
        return meshToGeometry(mesh);
    }, []);

    const booleanOperation = useCallback(async (meshA, meshB, operation) => {
        const mesh = await cadClient.meshBoolean(meshA, meshB, operation);
        return meshToGeometry(mesh);
    }, []);

    return {
        isLoading,
        isReady,
        error,
        loadProgress,
        // Primitives
        createBox,
        createCylinder,
        createSphere,
        // Operations
        extrudeProfile,
        booleanOperation,
        // Utilities
        meshToGeometry,
        // Direct access to the worker-backed client for advanced use
        client: cadClient,
    };
}

export default useCAD;
