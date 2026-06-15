import { useState, useEffect } from 'react';
import apiService from '../services/apiService';

export const useWeb3Status = () => {
  const [status, setStatus] = useState({
    initialized: false,
    network: null,
    contract: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const checkWeb3Status = async () => {
      try {
        setStatus(prev => ({ ...prev, loading: true, error: null }));

        const response = await apiService.getWeb3Status();

        console.log('📡 Web3 status response:', response);

        // Map the backend response to frontend expected format
        setStatus({
          initialized: response.data?.connected || response.connected,
          network: {
            name: response.data?.name || response.name,
            chainId: response.data?.chainId || response.chainId,
            networkName: response.data?.name || response.name,
          },
          contract: {
            address: response.data?.contractAddress || response.contractAddress,
            deployed:
              response.data?.contractDeployed || response.contractDeployed,
          },
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Failed to check Web3 status:', error);
        setStatus(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
      }
    };

    checkWeb3Status();

    // Check status every 30 seconds
    const interval = setInterval(checkWeb3Status, 30000);

    return () => clearInterval(interval);
  }, []);

  const initializeWeb3 = async () => {
    // The backend initializes Web3 on startup; there is no client-triggered init
    // endpoint. This simply re-fetches the current status on demand.
    try {
      setStatus(prev => ({ ...prev, loading: true, error: null }));

      const response = await apiService.getWeb3Status();
      setStatus({
        initialized: response.data?.connected || response.connected,
        network: {
          name: response.data?.name || response.name,
          chainId: response.data?.chainId || response.chainId,
        },
        contract: {
          address: response.data?.contractAddress || response.contractAddress,
          deployed: response.data?.contractDeployed || response.contractDeployed,
        },
        loading: false,
        error: null,
      });

      return true;
    } catch (error) {
      console.error('Failed to refresh Web3 status:', error);
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
      return false;
    }
  };

  return {
    ...status,
    initializeWeb3,
  };
};

export const useMarketplace = () => {
  const [marketplace, setMarketplace] = useState({
    items: [],
    stats: null,
    loading: true,
    error: null,
  });

  const fetchMarketplaceData = async () => {
    try {
      setMarketplace(prev => ({ ...prev, loading: true, error: null }));

      const [itemsResponse, statsResponse] = await Promise.all([
        apiService.getMarketplaceItems(),
        apiService.getMarketplaceStats(),
      ]);

      const rawItems = itemsResponse.data || [];

      // Helper: normalise any IPFS URL to a Pinata gateway HTTP URL
      const resolveIpfsUrl = (url) => {
        if (!url) return url;
        // Extract CID from any /ipfs/<CID> path (handles lighthouse, cloudflare, pinata, etc.)
        const match = url.match(/\/ipfs\/(.+)$/);
        if (match) return `https://gateway.pinata.cloud/ipfs/${match[1]}`;
        // Handle raw ipfs:// scheme
        if (url.startsWith('ipfs://')) return `https://gateway.pinata.cloud/ipfs/${url.slice(7)}`;
        return url;
      };

      // Enrich items missing imageUrl or modelUrl by fetching their IPFS tokenURI metadata via Pinata
      const enrichedItems = await Promise.all(
        rawItems.map(async (item) => {
          const hasMissingImage =
            (!item.imageUrl || item.imageUrl === '/placeholder.jpg') &&
            (!Array.isArray(item.images) || item.images.length === 0);
          const hasMissingModel = !item.modelUrl;
          // Skip if already complete
          if (!hasMissingImage && !hasMissingModel) return item;
          // Skip if no usable tokenURI
          if (!item.tokenURI || item.tokenURI.includes('undefined')) return item;

          try {
            const metaUrl = resolveIpfsUrl(item.tokenURI);
            const metaResponse = await fetch(metaUrl, { signal: AbortSignal.timeout(10000) });
            if (!metaResponse.ok) return item;
            const meta = await metaResponse.json();

            // Pull image from IPFS metadata and normalise through Pinata
            const rawImage = meta.image || (Array.isArray(meta.images) && meta.images[0]) || '';
            const imageUrl = resolveIpfsUrl(rawImage);
            const rawImages = Array.isArray(meta.images) && meta.images.length > 0
              ? meta.images
              : rawImage ? [rawImage] : [];
            const images = rawImages.map(resolveIpfsUrl);
            // Pull 3D model URL from animation_url (set by backend upload)
            const modelUrl = resolveIpfsUrl(meta.animation_url || '') || item.modelUrl;
            const title = item.title && !item.title.startsWith('CAD Model #') ? item.title : (meta.name || item.title);
            const description = item.description || meta.description || '';

            return {
              ...item,
              ...(hasMissingImage && rawImage ? { imageUrl, images } : {}),
              ...(hasMissingModel && modelUrl ? { modelUrl } : {}),
              title,
              description,
            };
          } catch {
            return item; // silently skip timed-out or failed fetches
          }
        })
      );

      setMarketplace({
        items: enrichedItems,
        stats: statsResponse.data || statsResponse || null,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to fetch marketplace data:', error);
      setMarketplace(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  };

  useEffect(() => {
    fetchMarketplaceData();
  }, []);

  const refreshMarketplace = () => {
    fetchMarketplaceData();
  };

  return {
    ...marketplace,
    refreshMarketplace,
  };
};

export const useBackendHealth = () => {
  const [health, setHealth] = useState({
    status: 'unknown',
    services: {},
    loading: true,
    error: null,
  });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        setHealth(prev => ({ ...prev, loading: true, error: null }));

        const response = await apiService.healthCheck();

        setHealth({
          status: response.status,
          services: response.services || {},
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Backend health check failed:', error);
        setHealth({
          status: 'error',
          services: {},
          loading: false,
          error: error.message,
        });
      }
    };

    checkHealth();

    // Check health every 60 seconds
    const interval = setInterval(checkHealth, 60000);

    return () => clearInterval(interval);
  }, []);

  return health;
};
