// src/cad/useCAD.js
// React hook for using the CAD geometry service

import { useState, useEffect, useCallback } from 'react';
import cadGeometryService from './CADGeometryService';
import * as THREE from 'three';

/**
 * React hook for CAD operations
 * Provides loading state and CAD geometry functions
 */
export function useCAD() {
    const [isLoading, setIsLoading] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState(null);
    const [loadProgress, setLoadProgress] = useState(0);

    // Initialize CAD service on mount
    useEffect(() => {
        let mounted = true;

        const initCAD = async () => {
            try {
                setIsLoading(true);
                setLoadProgress(10);

                await cadGeometryService.init();

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
        };

        initCAD();

        return () => {
            mounted = false;
        };
    }, []);

    /**
     * Convert BREP shape to Three.js BufferGeometry
     */
    const shapeToThreeGeometry = useCallback((shape) => {
        const meshData = cadGeometryService.shapeToMesh(shape);

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(meshData.vertices, 3));
        geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));

        // Compute normals for proper lighting
        geometry.computeVertexNormals();

        return geometry;
    }, []);

    /**
     * Create a box and return Three.js geometry
     */
    const createBox = useCallback((width, height, depth, position) => {
        if (!isReady) throw new Error('CAD not ready');
        const shape = cadGeometryService.createBox(width, height, depth, position);
        return shapeToThreeGeometry(shape);
    }, [isReady, shapeToThreeGeometry]);

    /**
     * Create a cylinder and return Three.js geometry
     */
    const createCylinder = useCallback((radius, height, position) => {
        if (!isReady) throw new Error('CAD not ready');
        const shape = cadGeometryService.createCylinder(radius, height, position);
        return shapeToThreeGeometry(shape);
    }, [isReady, shapeToThreeGeometry]);

    /**
     * Create a sphere and return Three.js geometry
     */
    const createSphere = useCallback((radius, position) => {
        if (!isReady) throw new Error('CAD not ready');
        const shape = cadGeometryService.createSphere(radius, position);
        return shapeToThreeGeometry(shape);
    }, [isReady, shapeToThreeGeometry]);

    /**
     * Extrude a 2D profile and return Three.js geometry
     * @param {Array} points - Array of {x, y} points
     * @param {number} height - Extrusion height
     */
    const extrudeProfile = useCallback((points, height, options) => {
        if (!isReady) throw new Error('CAD not ready');
        const shape = cadGeometryService.extrudeProfile(points, height, options);
        return shapeToThreeGeometry(shape);
    }, [isReady, shapeToThreeGeometry]);

    /**
     * Boolean union and return Three.js geometry
     */
    const booleanUnion = useCallback((geometry1, geometry2) => {
        if (!isReady) throw new Error('CAD not ready');
        // Note: This requires storing BREP shapes, not geometries
        // For now, this is a placeholder - proper implementation needs shape storage
        throw new Error('Boolean operations require BREP shape storage - not yet implemented');
    }, [isReady]);

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
        booleanUnion,
        // Utilities
        shapeToThreeGeometry,
        // Direct access to service for advanced use
        service: cadGeometryService
    };
}

export default useCAD;
