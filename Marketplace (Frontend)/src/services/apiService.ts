// API configuration and service for ChainTorque Web3 backend

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface Web3Status {
  connected: boolean;
  account?: string;
  network?: string;
  balance?: string;
}

export interface MarketplaceItem {
  tokenId: number;
  title: string;
  description: string;
  price: string;
  priceETH?: number;
  seller: {
    name: string;
    avatar: string;
    verified: boolean;
    rating: number;
    totalSales: number;
  };
  images: string[];
  modelUrl: string;
  category: string;
  tags: string[];
  views: number;
  likes: number;
  createdAt: string;
  blockchain?: string;
  format?: string;
  royalty?: number;
}

// Backend URLs for fallback support
const PRIMARY_API_URL = 'https://chaintorque-backend.onrender.com/api';
const FALLBACK_API_URL = 'https://chain-torque-backend.onrender.com/api';

// Track which backend is currently active
let activeApiUrl: string | null = null;

// Use environment variable, or detect production vs development
const getApiBaseUrl = () => {
  // If we've already determined a working URL, use it
  if (activeApiUrl) return activeApiUrl;

  // 1. Environment variable takes priority
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // 2. If running on localhost, use local backend
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5001/api';
  }
  // 3. Otherwise, use production Render backend (primary)
  return PRIMARY_API_URL;
};

const API_BASE_URL = getApiBaseUrl();

// Helper to switch to fallback URL
const switchToFallback = () => {
  if (activeApiUrl !== FALLBACK_API_URL) {
    console.log('🔄 Switching to fallback backend:', FALLBACK_API_URL);
    activeApiUrl = FALLBACK_API_URL;
  }
};

class ApiService {
  public baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  // Helper method for making requests with automatic fallback
  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    let url = `${activeApiUrl || this.baseUrl}${endpoint}`;
    // Log removed for security/cleanliness


    // Don't set Content-Type for FormData - browser sets it automatically with boundary
    const isFormData = options.body instanceof FormData;

    const config: RequestInit = {
      ...options,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // If server error (5xx) and we're on primary, try fallback
      if (response.status >= 500 && activeApiUrl !== FALLBACK_API_URL) {
        switchToFallback();
        this.baseUrl = FALLBACK_API_URL;
        url = `${FALLBACK_API_URL}${endpoint}`;
        const fallbackResponse = await fetch(url, config);
        const data = await fallbackResponse.json();
        if (!fallbackResponse.ok) {
          throw new Error(data.error || data.message || `HTTP error! status: ${fallbackResponse.status}`);
        }
        return data;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error: any) {
      // On connection error, try fallback if not already using it
      if (activeApiUrl !== FALLBACK_API_URL && (error.name === 'TypeError' || error.message?.includes('fetch'))) {
        switchToFallback();
        this.baseUrl = FALLBACK_API_URL;
        try {
          url = `${FALLBACK_API_URL}${endpoint}`;
          const fallbackResponse = await fetch(url, config);
          const data = await fallbackResponse.json();
          if (!fallbackResponse.ok) {
            throw new Error(data.error || data.message || `HTTP error! status: ${fallbackResponse.status}`);
          }
          return data;
        } catch (fallbackError: any) {
          console.error(`❌ Fallback API request also failed for ${endpoint}:`, fallbackError);
        }
      }

      console.error(`❌ API request failed for ${endpoint}:`, error);
      // Return a consistent error structure even if fetch fails
      return {
        success: false,
        data: null as any,
        message: 'Network or Server Error',
        error: error.message || 'Unknown error'
      };
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(this.baseUrl.replace('/api', '/health'));
    return response.json();
  }

  // Web3 endpoints
  async getWeb3Status(): Promise<ApiResponse<Web3Status>> {
    return this.request('/web3/status', { method: 'GET' });
  }

  async initializeWeb3(): Promise<ApiResponse<{ connected: boolean; account: string }>> {
    return this.request('/web3/connect', { method: 'POST' });
  }

  async validateAddress(address: string): Promise<ApiResponse<{ valid: boolean }>> {
    return this.request('/web3/validate-address', {
      method: 'POST',
      body: JSON.stringify({ address }),
    });
  }

  async getBalance(address: string): Promise<ApiResponse<{ balance: string }>> {
    return this.request(`/web3/balance/${address}`, { method: 'GET' });
  }

  // Marketplace endpoints
  async getMarketplaceItems(): Promise<ApiResponse<MarketplaceItem[]>> {
    const timestamp = Date.now();
    return this.request(`/marketplace?_t=${timestamp}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
  }

  async getMarketplaceItem(tokenId: number | string): Promise<ApiResponse<MarketplaceItem>> {
    return this.request(`/marketplace/${tokenId}`, { method: 'GET' });
  }

  async getMarketplaceStats(): Promise<ApiResponse<any>> {
    return this.request('/marketplace/stats', { method: 'GET' });
  }

  /* Legacy createMarketplaceItem removed. Use uploadFilesToIPFS + Sync logic. */


  /**
   * Syncs a client-side purchase with the backend database
   */
  async syncPurchase(tokenId: number | string, transactionHash: string, buyerAddress: string, price: string): Promise<ApiResponse<any>> {
    return this.request('/marketplace/sync-purchase', {
      method: 'POST',
      body: JSON.stringify({
        tokenId: Number(tokenId),
        transactionHash,
        buyerAddress,
        price
      }),
    });
  }

  /**
   * DECENTRALIZED FLOW: Upload files to IPFS only (no blockchain minting)
   * Returns tokenURI that user will use when calling createToken from their wallet
   */
  async uploadFilesToIPFS(formData: FormData): Promise<ApiResponse<{
    tokenURI: string;
    imageUrl: string;
    images: string[];
    modelUrl: string;
    metadataUrl: string;
  }>> {
    // For FormData, we must NOT set Content-Type header; browser sets it with boundary
    return this.request('/marketplace/upload-files', {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * DECENTRALIZED FLOW: Sync NFT creation after user mints from frontend
   * Called after user successfully calls createToken from their wallet
   */
  async syncCreation(data: {
    tokenId: number;
    transactionHash: string;
    walletAddress: string;
    title: string;
    description: string;
    category: string;
    price: string;
    imageUrl: string;
    images: string[];
    modelUrl: string;
    tokenURI: string;
    username?: string;
    royalty?: number;
  }): Promise<ApiResponse<{ tokenId: number; seller: string }>> {
    return this.request('/marketplace/sync-creation', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // User NFT endpoints
  async getUserNFTs(userAddress: string): Promise<ApiResponse<any[]>> {
    return this.request(`/user/${userAddress}/nfts`, { method: 'GET' });
  }

  async getUserPurchases(userAddress: string): Promise<ApiResponse<any[]>> {
    return this.request(`/user/${userAddress}/purchases`, { method: 'GET' });
  }

  async getUserSales(userAddress: string): Promise<ApiResponse<any[]>> {
    return this.request(`/user/${userAddress}/sales`, { method: 'GET' });
  }

  async getUserProfileByAddress(userAddress: string): Promise<ApiResponse<any>> {
    return this.request(`/user/${userAddress}/profile`, { method: 'GET' });
  }

  /**
   * legacy method removed. Use purchaseItem (web3) + syncPurchase (api) instead.
   */

  async getUserProfile(authToken: string): Promise<ApiResponse<any>> {
    return this.request('/user/profile', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async registerUser(data: { walletAddress: string; username?: string; email?: string; displayName?: string }): Promise<ApiResponse<any>> {
    return this.request('/user/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async uploadFile(file: File, authToken: string): Promise<ApiResponse<{ url: string; filename: string; size: number }>> {
    const formData = new FormData();
    formData.append('file', file);
    const headers: any = { Authorization: `Bearer ${authToken}` };

    return this.request('/upload', {
      method: 'POST',
      headers,
      body: formData,
    });
  }

  // Legacy aliases removed.


  async isBackendConnected(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl.replace('/api', '/health'));
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

const apiService = new ApiService();
export default apiService;

export const {
  healthCheck,
  getWeb3Status,
  initializeWeb3,
  validateAddress,
  getBalance,
  getMarketplaceItems,
  getMarketplaceItem,
  getUserNFTs,
  getUserPurchases,
  getUserSales,
  getUserProfileByAddress,
  getMarketplaceStats,
  syncPurchase,
  getUserProfile,
  uploadFile,
  isBackendConnected,
} = apiService;
