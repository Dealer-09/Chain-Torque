// Mesh Operations Panel - Boolean operations on imported GLB models
import React, { useState, useEffect } from 'react';
import { FaCube, FaPlus, FaMinus, FaLayerGroup } from 'react-icons/fa';
import cadGeometryService from '../cad/CADGeometryService';

const MeshOperations = ({ features = [], onOperationComplete }) => {
  const [baseFeatureId, setBaseFeatureId] = useState('');
  const [toolFeatureId, setToolFeatureId] = useState('');
  const [operation, setOperation] = useState('union');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cadReady, setCadReady] = useState(false);
  const [error, setError] = useState(null);

  // Initialize CAD service
  useEffect(() => {
    cadGeometryService.init().then(() => setCadReady(true)).catch(() => { });
  }, []);

  // Get features with mesh data (3D solids, AI models)
  const meshFeatures = features.filter(f => {
    const hasMeshData = f.meshData && (f.meshData.vertices || f.meshData.indices);
    const isValidType = f.type === '3d-solid' || f.source === 'ai-model';
    console.log(`Feature ${f.name}: hasMeshData=${hasMeshData}, isValidType=${isValidType}`, f);
    return hasMeshData && isValidType;
  });

  console.log(`Total features: ${features.length}, Mesh features: ${meshFeatures.length}`);

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

      // Perform mesh boolean operation
      const resultMesh = cadGeometryService.meshBooleanOperation(
        baseFeature.meshData,
        toolFeature.meshData,
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
      background: 'rgba(40, 44, 52, 0.6)',
      borderRadius: '6px',
      marginTop: '12px',
      border: '1px solid rgba(80, 90, 110, 0.4)'
    }}>
      <div className="operations-header" style={{ marginBottom: '14px' }}>
        <h4 style={{ 
          margin: '0 0 6px 0', 
          fontSize: '13px', 
          color: '#e0e0e0',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FaCube size={14} style={{ color: '#667eea' }} />
          Boolean Operations
        </h4>
        <p style={{ 
          fontSize: '11px', 
          color: '#999', 
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
          color: '#888',
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
          <p style={{ margin: '0 0 8px 0', color: '#aaa', fontSize: '12px' }}>
            Currently detected: {meshFeatures.length} mesh feature{meshFeatures.length !== 1 ? 's' : ''}
          </p>
          <p style={{ margin: '0 0 8px 0', color: '#aaa', fontSize: '12px' }}>
            Total features: {features.length}
          </p>
          <small style={{ color: '#666', fontSize: '11px', display: 'block', marginTop: '8px', lineHeight: '1.5' }}>
            💡 To add more features:<br/>
            • Use Image-to-3D AI (magic wand icon)<br/>
            • Ask Torquy to create shapes<br/>
            • Draw & extrude 2D sketches
          </small>
          {meshFeatures.length === 1 && (
            <div style={{ 
              marginTop: '12px', 
              padding: '8px', 
              background: 'rgba(79, 172, 254, 0.1)',
              borderRadius: '4px'
            }}>
              <small style={{ color: '#4facfe', fontSize: '10px' }}>
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
                  const shape = cadGeometryService.createBox(size, size, size, pos);
                  const meshData = cadGeometryService.shapeToMesh(shape);
                  
                  if (onOperationComplete) {
                    onOperationComplete({
                      id: `test_cube_${Date.now()}`,
                      type: '3d-solid',
                      name: `Test Cube ${meshFeatures.length + 1}`,
                      source: 'test-primitive',
                      meshData: meshData,
                      visible: true,
                      color: meshFeatures.length === 0 ? '#4facfe' : '#ff6b6b'
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
                background: 'rgba(90, 159, 212, 0.2)',
                border: '1px solid rgba(90, 159, 212, 0.4)',
                borderRadius: '4px',
                color: '#a8cfe6',
                fontSize: '11px',
                fontWeight: '500',
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
              color: '#aaa', 
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
                  border: operation === 'union' ? '1px solid #5a9fd4' : '1px solid rgba(80, 90, 110, 0.5)',
                  background: operation === 'union' ? 'rgba(90, 159, 212, 0.15)' : 'rgba(40, 44, 52, 0.8)',
                  color: operation === 'union' ? '#82b1d9' : '#888',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '500',
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
                  border: operation === 'cut' ? '1px solid #d48686' : '1px solid rgba(80, 90, 110, 0.5)',
                  background: operation === 'cut' ? 'rgba(212, 134, 134, 0.15)' : 'rgba(40, 44, 52, 0.8)',
                  color: operation === 'cut' ? '#d9a0a0' : '#888',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '500',
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
                  border: operation === 'intersect' ? '1px solid #6fb3b8' : '1px solid rgba(80, 90, 110, 0.5)',
                  background: operation === 'intersect' ? 'rgba(111, 179, 184, 0.15)' : 'rgba(40, 44, 52, 0.8)',
                  color: operation === 'intersect' ? '#8fc9cd' : '#888',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '500',
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
              color: '#aaa', 
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
                background: 'rgba(40, 40, 40, 0.9)',
                border: '1px solid #444',
                borderRadius: '4px',
                color: '#fff',
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
              color: '#aaa', 
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
                background: 'rgba(40, 40, 40, 0.9)',
                border: '1px solid #444',
                borderRadius: '4px',
                color: '#fff',
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
              color: '#fca5a5',
              fontSize: '12px',
              lineHeight: '1.5',
              fontWeight: '500'
            }}>
              <div style={{ marginBottom: '4px', fontWeight: '700', color: '#ff6b6b' }}>
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
                ? 'rgba(50, 54, 62, 0.6)' 
                : 'rgba(90, 159, 212, 0.25)',
              border: (isProcessing || !baseFeatureId || !toolFeatureId)
                ? '1px solid rgba(80, 90, 110, 0.3)'
                : '1px solid rgba(90, 159, 212, 0.5)',
              borderRadius: '4px',
              color: (isProcessing || !baseFeatureId || !toolFeatureId) ? '#666' : '#c5dff0',
              fontWeight: '500',
              fontSize: '12px',
              cursor: (isProcessing || !baseFeatureId || !toolFeatureId) ? 'not-allowed' : 'pointer',
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
            background: 'rgba(60, 70, 85, 0.3)',
            border: '1px solid rgba(80, 90, 110, 0.4)',
            borderRadius: '3px',
            fontSize: '10px',
            color: '#777',
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
