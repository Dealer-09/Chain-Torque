// src/components/FeatureTree.js
import React from 'react';
import { FaCube, FaCircle, FaSquare, FaEye, FaEyeSlash, FaTrash } from 'react-icons/fa';

const FeatureTree = ({ features, onFeatureToggle, onFeatureDelete, onFeatureSelect }) => {
  const getFeatureIcon = (type) => {
    switch (type) {
      case 'extrude':
        return <FaCube />;
      case 'revolve':
        return <FaCircle />;
      case 'sketch':
        return <FaSquare />;
      default:
        return <FaCube />;
    }
  };

  return (
    <div className="feature-tree">
      <div className="feature-tree-header">
        <h3>Feature Tree</h3>
      </div>
      <div className="feature-list">
        {features.length === 0 ? (
          <div className="no-features">
            <p>No features created yet</p>
            <p className="hint">Start by creating a sketch</p>
          </div>
        ) : (
          features.map((feature, index) => (
            <div
              key={feature.id}
              className={`feature-item ${feature.visible ? 'visible' : 'hidden'}`}
              onClick={() => onFeatureSelect && onFeatureSelect(feature)}
            >
              <div className="feature-icon">
                {getFeatureIcon(feature.operation)}
              </div>
              <div className="feature-info">
                <div className="feature-name">
                  {feature.name || `${feature.type} ${index + 1}`}
                </div>
                <div className="feature-details">
                  {feature.type === 'polygon' && (
                    <>
                      {`${feature.points?.length || 0} points`}
                      {feature.arcEdges?.length > 0 && (
                        <span className="arc-info" style={{ color: 'hsl(217.9 10.6% 64.9%)', marginLeft: '4px' }}>
                          🌙 {feature.arcEdges.length} arc{feature.arcEdges.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {feature.cutEdges?.length > 0 && (
                        <span className="cut-warning"> ⚠️ {feature.cutEdges.length} cut</span>
                      )}
                      {feature.cutEdges?.length === 0 && feature.arcEdges?.length > 0 && (
                        <span style={{ color: 'hsl(210 20% 98%)', marginLeft: '4px' }}> ✓ closed</span>
                      )}
                    </>
                  )}
                  {feature.type === 'lines' && (
                    <>
                      {`${feature.lines?.length || 0} lines`}
                      {feature.cutEdges?.length > 0
                        ? <span className="cut-warning"> ⚠️ {feature.cutEdges.length} cut (open)</span>
                        : feature.closed ? ' (closed)' : ''
                      }
                    </>
                  )}
                  {feature.type === '3d-solid' && `Extruded${feature.height ? ` H:${feature.height}` : ''}`}
                  {!['polygon', 'lines', '3d-solid'].includes(feature.type) && `${feature.type}`}
                </div>
              </div>
              <div className="feature-controls">
                <button
                  className="toggle-visibility"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFeatureToggle && onFeatureToggle(feature.id);
                  }}
                  title={feature.visible ? 'Hide' : 'Show'}
                >
                  {feature.visible ? <FaEye /> : <FaEyeSlash />}
                </button>
                <button
                  className="delete-feature"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFeatureDelete && onFeatureDelete(feature.id);
                  }}
                  title="Delete"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FeatureTree;
