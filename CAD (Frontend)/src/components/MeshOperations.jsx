// Mesh Operations Panel - Boolean operations on imported GLB models
import React, { useState, useEffect } from 'react';
import { FaCube, FaPlus, FaMinus, FaLayerGroup } from 'react-icons/fa';
import cadClient from '../cad/cadClient';
import { placedMeshData } from '../three/transformMesh';
import { useSettingsStore } from '../store/settingsStore';

const MeshOperations = ({ features = [], onOperationComplete }) => {
  const theme = useSettingsStore((s) => s.theme);
  const getActiveTheme = (themeVal) => {
    if (themeVal === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return themeVal;
  };
  const activeTheme = getActiveTheme(theme);
  const [baseFeatureId, setBaseFeatureId] = useState('');
  const [toolFeatureId, setToolFeatureId] = useState('');
  const [operation, setOperation] = useState('union');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cadReady, setCadReady] = useState(false);
  const [error, setError] = useState(null);

  // Initialize CAD service
  useEffect(() => {
    cadClient.init().then(() => setCadReady(true)).catch(() => { });
  }, []);

  // Get features with mesh data (3D solids, AI models)
  const meshFeatures = features.filter(f => {
    const hasMeshData = !!(f.meshData && (f.meshData.vertices || f.meshData.indices));
    const isValidType = f.type === '3d-solid' || f.source === 'ai-model';
    // Removed massive console.log that caused severe UI lag by dumping Float32Arrays on every render
    return hasMeshData && isValidType;
  });

  const handleBooleanOperation = async () => {
    if (!cadReady || !baseFeatureId || !toolFeatureId) return;

    const baseFeature = features.find(f => f.id === baseFeatureId);
    const toolFeature = features.find(f => f.id === toolFeatureId);

    if (!baseFeature || !toolFeature) {
      setError('Please select both base and tool features');
      return;
    }

    if (!baseFeature.meshData || !toolFeature.meshData) {
      setError('Selected features do not have mesh data');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log(`Performing ${operation} on ${baseFeature.name} and ${toolFeature.name}`);

      // Perform mesh boolean operation (off-thread via worker, with main-thread fallback).
      // Bake each solid's object transform into its vertices first so the boolean uses
      // the placed (moved/rotated/scaled) geometry, not the un-transformed authoring mesh.
      const resultMesh = await cadClient.meshBoolean(
        placedMeshData(baseFeature),
        placedMeshData(toolFeature),
        operation
      );

      if (onOperationComplete) {
        onOperationComplete({
          id: `bool_${operation}_${Date.now()}`,
          type: '3d-solid',
          name: `${operation.toUpperCase()}: ${baseFeature.name} & ${toolFeature.name}`,
          source: 'boolean-operation',
          meshData: resultMesh,
          visible: true,
          operation: operation,
          baseFeatureId: baseFeature.id,
          toolFeatureId: toolFeature.id
        });
      }

      // Reset selections
      setBaseFeatureId('');
      setToolFeatureId('');
      setError(null);

      console.log(`Boolean ${operation} completed successfully`);

    } catch (err) {
      console.error('Boolean operation error:', err);
      let errorMsg = err.message || 'Boolean operation failed';
      
      // Add helpful context for common errors
      if (errorMsg.includes('too complex') || errorMsg.includes('triangles')) {
        errorMsg += ' 💡 Try using the "Quick Add Test Cube" button to create simpler test shapes!';
      } else if (errorMsg.includes('Sewing') || errorMsg.includes('Perform')) {
        errorMsg = 'Mesh conversion failed. This feature works best with simple geometric shapes (cubes, spheres). ' +
                   'Complex AI models may not convert properly. Try using test cubes instead!';
      }
      
      setError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const getOperationIcon = (op) => {
    switch (op) {
      case 'union': return <FaPlus />;
      case 'cut': return <FaMinus />;
      case 'intersect': return <FaLayerGroup />;
      default: return <FaCube />;
    }
  };

  return (
    <div className="mesh-operations" style={{
      padding: '14px',
      background: 'var(--bg-panel)',
      borderRadius: '6px',
      marginTop: '12px',
      border: '1px solid var(--border-color)'
    }}>
      <div className="operations-header" style={{ marginBottom: '14px' }}>
        <h4 style={{ 
          margin: '0 0 6px 0', 
          fontSize: '13px', 
          color: 'var(--fg-main)',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FaCube size={14} style={{ color: 'var(--fg-main)' }} />
          Boolean Operations
        </h4>
        <p style={{ 
          fontSize: '11px', 
          color: 'var(--fg-muted)', 
          margin: '0',
          lineHeight: '1.4'
        }}>
          Combine, subtract, or intersect mesh features
        </p>
      </div>

      {!cadReady ? (
        <div className="loading-cad" style={{ 
          padding: '12px', 
          textAlign: 'center', 
          color: 'var(--fg-muted)',
          fontSize: '12px'
        }}>
          Loading CAD kernel...
        </div>
      ) : meshFeatures.length < 2 ? (
        <div className="no-features" style={{
          padding: '16px',
          textAlign: 'center',
          background: 'rgba(255, 193, 7, 0.1)',
          border: '1px solid rgba(255, 193, 7, 0.3)',
          borderRadius: '6px'
        }}>
          <p style={{ margin: '0 0 8px 0', color: '#ffc107', fontSize: '13px', fontWeight: '600' }}>
            ⚠️ Need at least 2 mesh features
          </p>
          <p style={{ margin: '0 0 8px 0', color: activeTheme === 'light' ? '#334155' : '#aaa', fontSize: '12px' }}>
            Currently detected: {meshFeatures.length} mesh feature{meshFeatures.length !== 1 ? 's' : ''}
          </p>
          <p style={{ margin: '0 0 8px 0', color: activeTheme === 'light' ? '#334155' : '#aaa', fontSize: '12px' }}>
            Total features: {features.length}
          </p>
          <small style={{ color: activeTheme === 'light' ? '#475569' : '#888', fontSize: '11px', display: 'block', marginTop: '8px', lineHeight: '1.5' }}>
            💡 To add more features:<br/>
            • Use Image-to-3D AI (magic wand icon)<br/>
            • Ask Torquy to create shapes<br/>
            • Draw & extrude 2D sketches
          </small>
          {meshFeatures.length === 1 && (
            <div style={{ 
              marginTop: '12px', 
              padding: '8px', 
              background: 'var(--bg-hover-glass)',
              borderRadius: '4px'
            }}>
              <small style={{ color: 'var(--fg-main)', fontSize: '10px' }}>
                ✓ Detected: {meshFeatures[0].name}
              </small>
            </div>
          )}
          {meshFeatures.length < 2 && cadReady && (
            <button
              onClick={async () => {
                try {
                  // Create a simple cube primitive for testing
                  const size = meshFeatures.length === 0 ? 5 : 3;
                  const pos = meshFeatures.length === 0 ? { x: 0, y: 0, z: 0 } : { x: 2, y: 2, z: 2 };
                  const meshData = await cadClient.primitiveToMesh('cube', { width: size, height: size, depth: size }, pos);

                  if (onOperationComplete) {
                    onOperationComplete({
                      id: `test_cube_${Date.now()}`,
                      type: '3d-solid',
                      name: `Test Cube ${meshFeatures.length + 1}`,
                      source: 'test-primitive',
                      meshData: meshData,
                      visible: true,
                      color: meshFeatures.length === 0 ? '#4ecdc4' : '#ff6b6b'
                    });
                  }
                } catch (err) {
                  console.error('Failed to create test cube:', err);
                  setError('Failed to create test cube: ' + err.message);
                }
              }}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '9px 12px',
                background: 'var(--bg-button-ghost)',
                border: '1px solid var(--border-button-ghost)',
                borderRadius: '4px',
                color: 'var(--fg-button-ghost)',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s',
                textTransform: 'uppercase',
                letterSpacing: '0.3px'
              }}
            >
              + Add Test Cube
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Operation Type Selection */}
          <div className="parameter-group" style={{ marginBottom: '12px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              color: 'var(--fg-main)', 
              marginBottom: '6px' 
            }}>
              Operation Type:
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setOperation('union')}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  border: operation === 'union' ? '1px solid var(--bg-button-primary)' : '1px solid var(--border-button-ghost)',
                  background: operation === 'union' ? 'var(--bg-button-primary)' : 'var(--bg-button-ghost)',
                  color: operation === 'union' ? 'var(--fg-button-primary)' : 'var(--fg-muted)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '600',
                  transition: 'all 0.15s'
                }}
              >
                <FaPlus size={10} style={{ marginRight: '5px' }} />
                Union
              </button>
              <button
                onClick={() => setOperation('cut')}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  border: operation === 'cut' ? '1px solid var(--bg-button-primary)' : '1px solid var(--border-button-ghost)',
                  background: operation === 'cut' ? 'var(--bg-button-primary)' : 'var(--bg-button-ghost)',
                  color: operation === 'cut' ? 'var(--fg-button-primary)' : 'var(--fg-muted)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '600',
                  transition: 'all 0.15s'
                }}
              >
                <FaMinus size={10} style={{ marginRight: '5px' }} />
                Cut
              </button>
              <button
                onClick={() => setOperation('intersect')}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  border: operation === 'intersect' ? '1px solid var(--bg-button-primary)' : '1px solid var(--border-button-ghost)',
                  background: operation === 'intersect' ? 'var(--bg-button-primary)' : 'var(--bg-button-ghost)',
                  color: operation === 'intersect' ? 'var(--fg-button-primary)' : 'var(--fg-muted)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '600',
                  transition: 'all 0.15s'
                }}
              >
                <FaLayerGroup size={10} style={{ marginRight: '5px' }} />
                Intersect
              </button>
            </div>
          </div>

          {/* Base Feature Selection */}
          <div className="parameter-group" style={{ marginBottom: '10px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              color: 'var(--fg-main)', 
              marginBottom: '4px' 
            }}>
              Base Feature:
            </label>
            <select
              value={baseFeatureId}
              onChange={(e) => { setBaseFeatureId(e.target.value); setError(null); }}
              style={{
                width: '100%',
                padding: '8px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--fg-main)',
                fontSize: '12px'
              }}
            >
              <option value="">-- Select base --</option>
              {meshFeatures.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.source || 'unknown'})
                </option>
              ))}
            </select>
          </div>

          {/* Tool Feature Selection */}
          <div className="parameter-group" style={{ marginBottom: '12px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              color: 'var(--fg-main)', 
              marginBottom: '4px' 
            }}>
              Tool Feature:
            </label>
            <select
              value={toolFeatureId}
              onChange={(e) => { setToolFeatureId(e.target.value); setError(null); }}
              style={{
                width: '100%',
                padding: '8px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--fg-main)',
                fontSize: '12px'
              }}
            >
              <option value="">-- Select tool --</option>
              {meshFeatures.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.source || 'unknown'})
                </option>
              ))}
            </select>
          </div>

          {/* Error Display */}
          {error && (
            <div style={{
              padding: '12px',
              marginBottom: '12px',
              background: 'rgba(220, 38, 38, 0.15)',
              border: '2px solid rgba(220, 38, 38, 0.5)',
              borderRadius: '6px',
              color: activeTheme === 'light' ? '#b91c1c' : '#fca5a5',
              fontSize: '12px',
              lineHeight: '1.5',
              fontWeight: '500'
            }}>
              <div style={{ marginBottom: '4px', fontWeight: '700', color: activeTheme === 'light' ? '#b91c1c' : '#ff6b6b' }}>
                ⚠️ Error
              </div>
              {error}
            </div>
          )}

          {/* Execute Button */}
          <button
            onClick={handleBooleanOperation}
            disabled={isProcessing || !baseFeatureId || !toolFeatureId}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: (isProcessing || !baseFeatureId || !toolFeatureId) 
                ? 'var(--bg-button-ghost)' 
                : 'var(--bg-button-primary)',
              border: (isProcessing || !baseFeatureId || !toolFeatureId)
                ? '1px solid var(--border-button-ghost)'
                : '1px solid var(--bg-button-primary)',
              color: (isProcessing || !baseFeatureId || !toolFeatureId) ? 'var(--fg-muted)' : 'var(--fg-button-primary)',
              fontWeight: '600',
              fontSize: '12px',
              cursor: (isProcessing || !baseFeatureId || !toolFeatureId) ? 'not-allowed' : 'pointer',
              opacity: (isProcessing || !baseFeatureId || !toolFeatureId) ? 0.5 : 1,
              transition: 'all 0.15s',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {isProcessing ? (
              <>Processing...</>
            ) : (
              <>
                {getOperationIcon(operation)}
                <span style={{ marginLeft: '6px' }}>Execute {operation}</span>
              </>
            )}
          </button>

          {/* Info */}
          <div style={{
            marginTop: '10px',
            padding: '7px 10px',
            background: 'var(--bg-hover-glass)',
            border: '1px solid var(--border-color)',
            borderRadius: '3px',
            fontSize: '10px',
            color: 'var(--fg-muted)',
            fontStyle: 'italic'
          }}>
            Base object will be modified by the tool object
          </div>
        </>
      )}
    </div>
  );
};

export default MeshOperations;
