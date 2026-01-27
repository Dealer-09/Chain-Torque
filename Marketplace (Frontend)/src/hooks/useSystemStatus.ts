import { useState, useEffect, useRef } from 'react';

interface SystemStatus {
  backend: string;
  web3: string;
  contract: string;
  lastCheck: string;
  marketplaceItems: number;
}

// Backend URLs for fallback support
const PRIMARY_BACKEND_URL = 'https://chaintorque-backend.onrender.com';
const FALLBACK_BACKEND_URL = 'https://chain-torque-backend.onrender.com';

// Detect production vs development with fallback support
const getBackendUrl = (useFallback: boolean = false) => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5001';
  }
  return useFallback ? FALLBACK_BACKEND_URL : PRIMARY_BACKEND_URL;
};

export const useSystemStatus = () => {
  const [status, setStatus] = useState<SystemStatus>({
    backend: 'checking...',
    web3: 'checking...',
    contract: 'checking...',
    lastCheck: new Date().toLocaleTimeString(),
    marketplaceItems: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const usingFallback = useRef(false);
  const backendUrl = getBackendUrl(usingFallback.current);

  const checkBackend = async () => {
    setIsLoading(true);
    try {
      // Check basic health
      const healthResponse = await fetch(`${backendUrl}/health`);
      const backendStatus = healthResponse.ok ? 'connected' : 'error';

      // Check web3 status
      let web3Status = 'disconnected';
      let contractStatus = 'not deployed';
      try {
        const web3Response = await fetch(
          `${backendUrl}/api/web3/status`
        );
        if (web3Response.ok) {
          const web3Data = await web3Response.json();
          // Backend returns data directly, not wrapped in 'data' field
          web3Status = web3Data.connected ? 'connected' : 'disconnected';
          contractStatus = web3Data.contractDeployed
            ? 'deployed'
            : 'not deployed';
        }
      } catch (error) {
        web3Status = 'error';
      }

      // Check marketplace API
      let itemCount = 0;
      try {
        const marketplaceResponse = await fetch(
          `${backendUrl}/api/marketplace`
        );
        if (marketplaceResponse.ok) {
          const marketplaceData = await marketplaceResponse.json();
          // Backend refactor returns { success: true, data: [...] }
          const items = marketplaceData.data || marketplaceData.items || [];
          itemCount = Array.isArray(items)
            ? items.length
            : marketplaceData.total || 0;
        }
      } catch (error) {
        console.log('Marketplace API error:', error);
      }

      setStatus({
        backend: backendStatus,
        web3: web3Status,
        contract: contractStatus,
        lastCheck: new Date().toLocaleTimeString(),
        marketplaceItems: itemCount,
      });
    } catch (error) {
      setStatus({
        backend: 'disconnected',
        web3: 'disconnected',
        contract: 'unknown',
        lastCheck: new Date().toLocaleTimeString(),
        marketplaceItems: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkBackend();
    const interval = setInterval(checkBackend, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Determine overall system status
  const getOverallStatus = () => {
    if (isLoading) return 'checking';
    if (status.backend === 'connected' && status.web3 === 'connected')
      return 'healthy';
    if (status.backend === 'connected') return 'partial';
    return 'error';
  };

  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
      case 'connected':
      case 'deployed':
        return 'text-green-500';
      case 'disconnected':
      case 'not deployed':
        return 'text-red-500';
      case 'error':
      case 'unknown':
        return 'text-orange-500';
      default:
        return 'text-gray-500';
    }
  };

  return {
    status,
    isLoading,
    checkBackend,
    getOverallStatus,
    getStatusColor,
  };
};
