import React, { useState, useRef } from 'react';
import { FaCloudUploadAlt, FaMagic, FaTimes, FaCheckCircle, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import './ImageTo3D.css';

// Helper to get backend URL matching Marketplace logic
const getBackendUrl = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL.replace(/\/api$/, '');
    }
    if (typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:5001';
    }
    return 'https://chaintorque-backend.onrender.com';
};

const ImageTo3D = ({ onClose, onModelGenerated }) => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, uploading, generating, success, error
    const [error, setError] = useState(null);
    const [generationProgress, setGenerationProgress] = useState(0);
    const fileInputRef = useRef(null);

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please select a valid image file (PNG, JPG, etc.)');
                return;
            }
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
            setError(null);
            setStatus('idle');
        }
    };

    const handleGenerate = async () => {
        if (!selectedImage) return;

        setStatus('generating');
        setError(null);
        setGenerationProgress(10);

        const formData = new FormData();
        formData.append('image', selectedImage);

        try {
            // Simulate progress since Gradio API is a black box for progress
            const progressInterval = setInterval(() => {
                setGenerationProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 2;
                });
            }, 1000);

            const backendUrl = getBackendUrl();
            const response = await fetch(`${backendUrl}/api/ai/generate-3d`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            clearInterval(progressInterval);

            if (data.success) {
                setGenerationProgress(100);
                setStatus('success');
                setTimeout(() => {
                    onModelGenerated(data.modelUrl);
                    onClose();
                }, 1500);
            } else {
                throw new Error(data.message || 'Failed to generate 3D model');
            }
        } catch (err) {
            console.error('Image-to-3D Error:', err);
            setError(err.message);
            setStatus('error');
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="image-to-3d-overlay">
            <div className="image-to-3d-modal glassmorphism">
                <div className="modal-header">
                    <h3><FaMagic /> Image to 3D AI</h3>
                    <button className="close-btn" onClick={onClose}><FaTimes /></button>
                </div>

                <div className="modal-body">
                    {status === 'idle' && (
                        <div className="upload-section">
                            {!previewUrl ? (
                                <div className="drop-zone" onClick={triggerFileInput}>
                                    <FaCloudUploadAlt className="upload-icon" />
                                    <p>Click or Drag & Drop a 2D image</p>
                                    <span>Support for PNG, JPG / Engineering sketches</span>
                                </div>
                            ) : (
                                <div className="preview-container">
                                    <img src={previewUrl} alt="Preview" className="image-preview" />
                                    <button className="change-btn" onClick={triggerFileInput}>Change Image</button>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageSelect}
                                accept="image/*"
                                hidden
                            />

                            <button
                                className={`generate-btn ${!selectedImage ? 'disabled' : ''}`}
                                onClick={handleGenerate}
                                disabled={!selectedImage}
                            >
                                Generate 3D Model
                            </button>
                        </div>
                    )}

                    {(status === 'generating' || status === 'success') && (
                        <div className="processing-section">
                            {status === 'generating' ? (
                                <>
                                    <div className="spinner-container">
                                        <FaSpinner className="spin-icon" />
                                    </div>
                                    <h4>Transforming Image...</h4>
                                    <p>Our AI is reconstructing 3D geometry from your 2D input. This usually takes 10-30 seconds.</p>
                                    <div className="progress-bar-container">
                                        <div className="progress-bar" style={{ width: `${generationProgress}%` }}></div>
                                    </div>
                                    <span className="progress-text">{generationProgress}%</span>
                                </>
                            ) : (
                                <div className="success-state">
                                    <FaCheckCircle className="success-icon" />
                                    <h4>Success!</h4>
                                    <p>Your 3D model has been generated and is loading into the workspace.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="error-section">
                            <FaExclamationTriangle className="error-icon" />
                            <h4>Generation Failed</h4>
                            <p className="error-message">{error}</p>
                            <button className="retry-btn" onClick={() => setStatus('idle')}>Try Again</button>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <p>Powered by Hunyuan3D-2 AI Architecture</p>
                </div>
            </div>
        </div>
    );
};

export default ImageTo3D;
