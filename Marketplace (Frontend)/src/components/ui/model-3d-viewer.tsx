import { Suspense, useRef, useState, Component, ReactNode } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { STLLoader } from 'three-stdlib';
import { OBJLoader } from 'three-stdlib';
import { Loader2 } from 'lucide-react';
import * as THREE from 'three';

import { Button } from '@/components/ui/button';

// Error Boundary for 3D components
class Model3DErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error?: Error }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('❌ 3D Model Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <mesh>
          <boxGeometry args={[2, 0.5, 0.1]} />
          <meshStandardMaterial color="#ff6b6b" />
        </mesh>
      );
    }

    return this.props.children;
  }
}

interface Model3DViewerProps {
  modelUrl: string;
  className?: string;
  fileType?: string; // Add optional fileType prop
}

function getFileExtension(url: string, fileType?: string): string {
  // If fileType is provided, use it directly but validate it's a supported format
  if (fileType) {
    const normalizedType = fileType.toLowerCase();
    const supportedFormats = ['glb', 'gltf', 'stl', 'obj'];

    // If it's a supported format, use it
    if (supportedFormats.includes(normalizedType)) {
      return normalizedType;
    }

    // If it's a generic term like 'CAD', try to find a supported format in the URL
    // or default to a common format
    if (normalizedType === 'cad' || normalizedType === 'step' || normalizedType === 'iges') {
      const urlExtension = url.split('.').pop()?.toLowerCase() || '';
      if (supportedFormats.includes(urlExtension)) {
        return urlExtension;
      }
      // Default to GLB for CAD files since it's most versatile for web viewing
      console.warn(`File type "${fileType}" is not directly supported for web 3D viewing. Attempting to load as GLB format.`);
      return 'glb';
    }
  }

  // Check for IPFS URLs (lighthouse, pinata, ipfs.io, dweb.link, etc.)
  // IPFS CIDs don't have file extensions, so default to GLB
  const ipfsPatterns = [
    'gateway.lighthouse.storage',
    'ipfs.io',
    'dweb.link',
    'pinata.cloud',
    'cloudflare-ipfs.com',
    '/ipfs/'
  ];

  const isIpfsUrl = ipfsPatterns.some(pattern => url.includes(pattern));
  if (isIpfsUrl) {
    // Check if URL has a recognizable extension at the end anyway
    const urlExtension = url.split('.').pop()?.toLowerCase() || '';
    const supportedFormats = ['glb', 'gltf', 'stl', 'obj'];
    if (supportedFormats.includes(urlExtension)) {
      console.log(`📦 IPFS URL detected with extension: ${urlExtension}`);
      return urlExtension;
    }
    // No extension found, default to GLB (most common 3D format on IPFS)
    console.log('📦 IPFS URL detected without extension, defaulting to GLB format');
    return 'glb';
  }

  // Fallback to URL-based detection
  return url.split('.').pop()?.toLowerCase() || '';
}

function Model({ url, fileType }: { url: string; fileType?: string }) {
  const extension = getFileExtension(url, fileType);

  // Debug logging
  console.log('🔍 Model Debug Info:', {
    url,
    fileType,
    detectedExtension: extension,
    supportedFormats: ['glb', 'gltf', 'stl', 'obj']
  });

  // Handle different file formats
  switch (extension) {
    case 'glb':
    case 'gltf':
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const gltfResult = useGLTF(url);
      console.log('✅ GLB/GLTF loaded successfully:', gltfResult);

      if (!gltfResult || !gltfResult.scene) {
        console.error('❌ GLB/GLTF scene is null or undefined', gltfResult);
        return (
          <mesh>
            <boxGeometry args={[2, 0.5, 0.1]} />
            <meshStandardMaterial color="#ff6b6b" />
          </mesh>
        );
      }

      // Ensure the scene has some content
      if (gltfResult.scene.children.length === 0) {
        console.warn('⚠️ GLB/GLTF scene has no children');
      }

      return <primitive object={gltfResult.scene} />;

    case 'stl':
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const stlGeometry = useLoader(STLLoader, url);
      const stlMaterial = new THREE.MeshStandardMaterial({
        color: '#60a5fa',
        metalness: 0.3,
        roughness: 0.4
      });
      return <mesh geometry={stlGeometry} material={stlMaterial} />;

    case 'obj':
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const objGroup = useLoader(OBJLoader, url);
      // Apply default material to OBJ if it doesn't have one
      objGroup.traverse((child: any) => {
        if (child.isMesh && !child.material) {
          child.material = new THREE.MeshStandardMaterial({
            color: '#60a5fa',
            metalness: 0.3,
            roughness: 0.4
          });
        }
      });
      return <primitive object={objGroup} />;

    default:
      // Fallback for unsupported formats - show error message
      console.warn(`Unsupported 3D file format: ${extension}. Supported formats: GLB, GLTF, STL, OBJ`);
      return (
        <mesh>
          <boxGeometry args={[2, 0.5, 0.1]} />
          <meshStandardMaterial color="#ff6b6b" />
        </mesh>
      );
  }
}

export function Model3DViewer({ modelUrl, className = '', fileType }: Model3DViewerProps) {
  const controlsRef = useRef<any>(null);
  const [rotation, setRotation] = useState(0);

  // Validate file format
  const extension = getFileExtension(modelUrl, fileType);
  const supportedFormats = ['glb', 'gltf', 'stl', 'obj'];
  const isSupported = supportedFormats.includes(extension);

  // Manual revolve
  const handleRevolve = () => {
    setRotation((prev) => prev + Math.PI / 8);
  };

  // Manual zoom in
  const handleZoomIn = () => {
    if (controlsRef.current) {
      controlsRef.current.dollyOut(1.2); // Zoom in should move camera closer
      controlsRef.current.update();
    }
  };

  // Manual zoom out
  const handleZoomOut = () => {
    if (controlsRef.current) {
      controlsRef.current.dollyIn(1.2); // Zoom out should move camera farther
      controlsRef.current.update();
    }
  };

  // Show error for unsupported formats
  if (!isSupported) {
    return (
      <div
        className={`relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center ${className}`}
        style={{ minHeight: 400 }}
      >
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Unsupported File Format</h3>
          <p className="text-sm text-gray-600 mb-2">
            The file format <span className="font-mono bg-gray-200 px-1 rounded">.{extension}</span> is not supported for 3D viewing.
          </p>
          <p className="text-xs text-gray-500 mb-2">
            URL: <span className="font-mono bg-gray-100 px-1 rounded text-xs break-all">{modelUrl}</span>
          </p>
          <p className="text-xs text-gray-500 mb-2">
            Detected Type: <span className="font-mono bg-gray-100 px-1 rounded">{fileType || 'from URL'}</span>
          </p>
          <p className="text-xs text-gray-500">
            Supported formats: {supportedFormats.map(f => f.toUpperCase()).join(', ')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}
      style={{ minHeight: 400 }}
    >
      <Suspense
        fallback={
          <div className='flex items-center justify-center h-full text-white'>
            <div className='text-center'>
              <Loader2 className='h-12 w-12 animate-spin mx-auto mb-4' />
              <h3 className='text-lg font-semibold mb-2'>Loading 3D Model</h3>
              <p className='text-sm text-gray-400'>Please wait while we load your model...</p>
            </div>
          </div>
        }
      >
        <Canvas camera={{ position: [0, 0, 3] }} style={{ height: '100%', width: '100%' }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[2, 2, 2]} intensity={1} />
          <group rotation={[0, rotation, 0]}>
            <Model3DErrorBoundary>
              <Model url={modelUrl} fileType={fileType} />
            </Model3DErrorBoundary>
          </group>
          <OrbitControls ref={controlsRef} enablePan={true} enableZoom={true} enableRotate={true} />
        </Canvas>
      </Suspense>

      {/* Manual Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <Button size="sm" onClick={handleRevolve}>Revolve</Button>
        <Button size="sm" onClick={handleZoomIn}>Zoom In (+)</Button>
        <Button size="sm" onClick={handleZoomOut}>Zoom Out (-)</Button>
      </div>
    </div>
  );
};
