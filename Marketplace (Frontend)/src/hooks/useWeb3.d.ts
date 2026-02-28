export interface NetworkInfo {
  name: string;
  chainId: number;
  networkName: string;
}

export interface ContractInfo {
  address: string;
  deployed: boolean;
}

export interface Web3Status {
  initialized: boolean;
  network: NetworkInfo | null;
  contract: ContractInfo | null;
  loading: boolean;
  error: string | null;
}

export interface MarketplaceItem {
  id: string | number;
  tokenId: number;
  title: string;
  name?: string;
  imageUrl?: string;
  previewHash?: string;
  price: string;
  username?: string;
  seller?: string;
  downloads?: string | number;
  category?: string;
  modelHash?: string;
  modelUrl?: string;
  tokenURI?: string;
  royalty?: number;
}

export interface MarketplaceStats {
  market?: {
    totalTokens: number;
    totalSold: number;
    activeListings: number;
  };
}

export interface MarketplaceState {
  items: MarketplaceItem[];
  stats: MarketplaceStats | null;
  loading: boolean;
  error: string | null;
}

export interface BackendHealth {
  status: string;
  services: Record<string, any>;
  loading: boolean;
  error: string | null;
}

export declare function useWeb3Status(): Web3Status & {
  initializeWeb3: () => Promise<boolean>;
};

export declare function useMarketplace(): MarketplaceState & {
  refreshMarketplace: () => void;
};

export declare function useBackendHealth(): BackendHealth;
