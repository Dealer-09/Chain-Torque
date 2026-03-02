import { useState, useEffect } from 'react';
import { getBackendUrl } from '@/lib/urls';

interface SystemStatus {
  backend: string;
  web3: string;
  contract: string;
  lastCheck: string;
  marketplaceItems: number;
}

export const useSystemStatus = () => {
  const [status, setStatus] = useState<SystemStatus>({
    backend: 'checking...',
    web3: 'checking...',
    contract: 'checking...',
    lastCheck: new Date().toLocaleTimeString(),
    marketplaceItems: 0,
  });

  const [isLoading, setIsLoading] = useState(true);

  const checkBackend = async () => {
    setIsLoading(true);
    const backendUrl = getBackendUrl();
    try {
      const healthResponse = await fetch(`${backendUrl}/health`);
      const backendStatus = healthResponse.ok ? 'connected' : 'error';

      let web3Status = 'disconnected';
      let contractStatus = 'not deployed';
      try {
        const web3Response = await fetch(`${backendUrl}/api/web3/status`);
        if (web3Response.ok) {
          const web3Data = await web3Response.json();
          web3Status = web3Data.connected ? 'connected' : 'disconnected';
          contractStatus = web3Data.contractDeployed ? 'deployed' : 'not deployed';
        }
      } catch {
        web3Status = 'error';
      }

      let itemCount = 0;
      try {
        const marketplaceResponse = await fetch(`${backendUrl}/api/marketplace`);
        if (marketplaceResponse.ok) {
          const marketplaceData = await marketplaceResponse.json();
          const items = marketplaceData.data || marketplaceData.items || [];
          itemCount = Array.isArray(items) ? items.length : marketplaceData.total || 0;
        }
      } catch {
        // marketplace check failed
      }

      setStatus({
        backend: backendStatus,
        web3: web3Status,
        contract: contractStatus,
        lastCheck: new Date().toLocaleTimeString(),
        marketplaceItems: itemCount,
      });
    } catch {
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
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  const getOverallStatus = () => {
    if (isLoading) return 'checking';
    if (status.backend === 'connected' && status.web3 === 'connected') return 'healthy';
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
