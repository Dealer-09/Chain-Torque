// src/components/CADTestComponent.js
// Test component to verify OpenCascade.js integration

import React, { useEffect, useState, useRef } from 'react';
import { useCAD } from '../cad';
import * as THREE from 'three';

/**
 * Test component that creates CAD geometry using OpenCascade
 * and displays it in a simple Three.js scene
 */
const CADTestComponent = ({ onGeometryCreated }) => {
    const { isLoading, isReady, error, createBox, createCylinder, createSphere, extrudeProfile } = useCAD();
    const [testStatus, setTestStatus] = useState('waiting');
    const [testResults, setTestResults] = useState([]);

    useEffect(() => {
        if (!isReady) return;

        const runTests = async () => {
            setTestStatus('running');
            const results = [];

            // Test 1: Create a box
            try {
                const boxGeometry = createBox(2, 2, 2, { x: 0, y: 0, z: 0 });
                results.push({ name: 'Create Box', success: true, vertices: boxGeometry.attributes.position.count });
                if (onGeometryCreated) onGeometryCreated('box', boxGeometry);
            } catch (err) {
                results.push({ name: 'Create Box', success: false, error: err.message });
            }

            // Test 2: Create a cylinder
            try {
                const cylGeometry = createCylinder(1, 3, { x: 4, y: 0, z: 0 });
                results.push({ name: 'Create Cylinder', success: true, vertices: cylGeometry.attributes.position.count });
                if (onGeometryCreated) onGeometryCreated('cylinder', cylGeometry);
            } catch (err) {
                results.push({ name: 'Create Cylinder', success: false, error: err.message });
            }

            // Test 3: Create a sphere
            try {
                const sphereGeometry = createSphere(1.5, { x: -4, y: 0, z: 0 });
                results.push({ name: 'Create Sphere', success: true, vertices: sphereGeometry.attributes.position.count });
                if (onGeometryCreated) onGeometryCreated('sphere', sphereGeometry);
            } catch (err) {
                results.push({ name: 'Create Sphere', success: false, error: err.message });
            }

            // Test 4: Extrude a profile (triangle)
            try {
                const trianglePoints = [
                    { x: 0, y: 0 },
                    { x: 2, y: 0 },
                    { x: 1, y: 2 }
                ];
                const extrudeGeometry = extrudeProfile(trianglePoints, 1);
                results.push({ name: 'Extrude Profile', success: true, vertices: extrudeGeometry.attributes.position.count });
                if (onGeometryCreated) onGeometryCreated('extrude', extrudeGeometry);
            } catch (err) {
                results.push({ name: 'Extrude Profile', success: false, error: err.message });
            }

            setTestResults(results);
            setTestStatus('complete');
        };

        runTests();
    }, [isReady, createBox, createCylinder, createSphere, extrudeProfile, onGeometryCreated]);

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.error}>
                    <h3>❌ OpenCascade Error</h3>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>
                    <div style={styles.spinner}></div>
                    <p>Loading OpenCascade.js CAD Kernel...</p>
                    <p style={styles.hint}>This may take a few seconds on first load</p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h3>🔧 OpenCascade.js Test</h3>
                <span style={styles.badge}>
                    {testStatus === 'complete' ? '✅ Ready' : '⏳ Testing...'}
                </span>
            </div>

            <div style={styles.results}>
                {testResults.map((result, idx) => (
                    <div key={idx} style={styles.resultItem}>
                        <span>{result.success ? '✅' : '❌'} {result.name}</span>
                        {result.success && <span style={styles.vertices}>{result.vertices} vertices</span>}
                        {!result.success && <span style={styles.errorText}>{result.error}</span>}
                    </div>
                ))}
            </div>

            {testStatus === 'complete' && testResults.every(r => r.success) && (
                <div style={styles.success}>
                    <p>🎉 All CAD operations working!</p>
                    <p style={styles.hint}>OpenCascade.js is ready for parametric modeling</p>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        position: 'absolute',
        top: '80px',
        left: '100px',
        background: 'rgba(30, 30, 30, 0.95)',
        border: '1px solid rgba(80, 80, 80, 0.5)',
        borderRadius: '8px',
        padding: '16px',
        color: '#ccc',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        minWidth: '280px',
        zIndex: 1000,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '1px solid rgba(80, 80, 80, 0.5)'
    },
    badge: {
        background: '#3b82f6',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        color: '#fff'
    },
    loading: {
        textAlign: 'center',
        padding: '20px'
    },
    spinner: {
        width: '30px',
        height: '30px',
        border: '3px solid #404040',
        borderTop: '3px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 12px'
    },
    results: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    resultItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 8px',
        background: 'rgba(60, 60, 60, 0.5)',
        borderRadius: '4px'
    },
    vertices: {
        color: '#888',
        fontSize: '11px'
    },
    errorText: {
        color: '#ef4444',
        fontSize: '11px'
    },
    success: {
        marginTop: '12px',
        padding: '12px',
        background: 'rgba(34, 197, 94, 0.2)',
        border: '1px solid rgba(34, 197, 94, 0.4)',
        borderRadius: '6px',
        textAlign: 'center'
    },
    error: {
        background: 'rgba(239, 68, 68, 0.2)',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        padding: '16px',
        borderRadius: '6px'
    },
    hint: {
        color: '#888',
        fontSize: '11px',
        marginTop: '4px'
    }
};

export default CADTestComponent;
