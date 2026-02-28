const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

class Web3Manager {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.contractAddress = null;
    this.initialized = false;

    // Category mapping
    this.categories = {
      1: 'Electronics',
      2: 'Collectibles',
      3: 'Art',
      4: 'Music',
      5: 'Gaming',
      6: 'Sports',
      7: 'Photography',
      8: 'Virtual Real Estate',
      9: 'Domain Names',
      10: 'Utility',
    };

    // Contract constants (matching Solidity)
    this.LISTING_PRICE = ethers.parseEther('0.00025'); // 0.00025 ETH
    this.MAX_BATCH_SIZE = 50;
    this.PLATFORM_FEE_BPS = 250; // 2.5%
  }

  /**
   * Initialize Web3 connection.
   * Requires RPC_URL and PRIVATE_KEY in environment.
   */
  async initialize() {
    try {
      const rpcUrl = process.env.RPC_URL;
      const privateKey = process.env.PRIVATE_KEY;
      if (!rpcUrl || !privateKey) {
        throw new Error('RPC_URL or PRIVATE_KEY not set in environment');
      }

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.signer = new ethers.Wallet(privateKey, this.provider);

      await this.loadContract();

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Web3 initialization failed:', error.message);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Load ABI and (if available) deployed address.
   */
  async loadContract() {
    try {
      const contractArtifactPath = path.join(
        __dirname,
        'artifacts',
        'contracts',
        'ChainTorqueMarketplace.sol',
        'ChainTorqueMarketplace.json'
      );

      if (!fs.existsSync(contractArtifactPath)) {
        console.warn('⚠️  Contract artifact not found. Blockchain features will be disabled.');
        this.contract = null;
        return;
      }

      const contractArtifact = JSON.parse(fs.readFileSync(contractArtifactPath, 'utf8'));
      const abi = contractArtifact.abi;

      // Try loading from contract-address.json first
      const deploymentPath = path.join(__dirname, 'contract-address.json');
      if (fs.existsSync(deploymentPath)) {
        try {
          const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
          this.contractAddress = deployment.ChainTorqueMarketplace;
          console.log('✅ Loaded contract address from file:', this.contractAddress);
        } catch (e) {
          console.warn('⚠️  Failed to parse contract-address.json:', e.message);
        }
      }

      // Fallback to environment variable if not set
      if (!this.contractAddress && process.env.CONTRACT_ADDRESS) {
        this.contractAddress = process.env.CONTRACT_ADDRESS;
        console.log('✅ Loaded contract address from ENV:', this.contractAddress);
      }

      if (this.contractAddress) {
        this.contract = new ethers.Contract(this.contractAddress, abi, this.signer);
        console.log('✅ Contract initialized successfully');
      } else {
        console.warn('⚠️  No contract address found (checked file and ENV). Contract not deployed.');
        this.contract = null;
      }
    } catch (error) {
      console.error('❌ Error loading contract:', error.message);
      this.contract = null;
    }
  }

  // Legacy write methods (createMarketItem, batchCreateMarketItems, purchaseToken, relistItem) removed.
  // Backend is now read-only and syncs with blockchain events.


  /**
   * Fetch active market items and enrich with metadata.
   */
  async getMarketItems() {
    try {
      if (!this.isReady()) throw new Error('Web3 Manager not initialized');

      const items = await this.contract.fetchMarketItems();
      const formattedItems = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        formattedItems.push(await this.formatMarketItem(item));
      }

      return { success: true, items: formattedItems, count: formattedItems.length };
    } catch (error) {
      console.error('Error fetching market items:', error.message);
      return { success: false, error: error.message, items: [] };
    }
  }

  /**
   * Fetch ALL market items (Active AND Sold) for DB Sync.
   * Leverages getCurrentTokenId() and getMarketItem() loop.
   */
  async getAllMarketItems() {
    try {
      if (!this.isReady()) throw new Error('Web3 Manager not initialized');

      const currentTokenId = Number(await this.contract.getCurrentTokenId());
      const formattedItems = [];

      // Fetch all items sequentially to prevent RPC rate limiting
      const rawItems = [];
      for (let i = 1; i <= currentTokenId; i++) {
        try {
          const item = await this.contract.getMarketItem(i);
          rawItems.push(item);
        } catch (e) {
          console.error(`[Web3] Error fetching market item ${i}:`, e.message);
        }
      }

      for (const item of rawItems) {
        if (item && item.tokenId > 0) {
          formattedItems.push(await this.formatMarketItem(item));
        }
      }

      return { success: true, items: formattedItems, count: formattedItems.length };
    } catch (error) {
      console.error('Error fetching ALL market items:', error.message);
      return { success: false, error: error.message, items: [] };
    }
  }

  // Refactored helper to avoid duplication
  async formatMarketItem(item) {
    let tokenId = Number(item.tokenId); // Direct access thanks to contract update

    // Default metadata values
    let tokenURI = '';
    let title = `NFT Model #${tokenId}`;
    let description = '';
    let imageUrl = '';
    let modelUrl = '';
    let images = [];

    try {
      tokenURI = await this.contract.tokenURI(tokenId);

      if (tokenURI.startsWith('http') || tokenURI.startsWith('ipfs://')) {
        let metadataUrl = tokenURI.startsWith('ipfs://')
          ? tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/')
          : tokenURI;

        try {
          const res = await fetch(metadataUrl);
          if (res.ok) {
            const metadata = await res.json();
            title = metadata.name || title;
            description = metadata.description || description;
            imageUrl = metadata.image || '';
            modelUrl = metadata.model || metadata.animation_url || '';
            if (Array.isArray(metadata.images)) {
              images = metadata.images;
            } else if (metadata.image) {
              images = [metadata.image];
            }
          } else {
            title = `CAD Model #${tokenId}`;
            description = `Professional 3D model in ${this.getCategoryName(item.category)} category`;
          }
        } catch (e) {
          title = `CAD Model #${tokenId}`;
          description = `Professional 3D model in ${this.getCategoryName(item.category)} category`;
        }
      } else {
        try {
          const metadata = JSON.parse(tokenURI);
          title = metadata.name || title;
          description = metadata.description || description;
          imageUrl = metadata.image || '';
          modelUrl = metadata.model || metadata.animation_url || '';
          if (Array.isArray(metadata.images)) {
            images = metadata.images;
          } else if (metadata.image) {
            images = [metadata.image];
          }
        } catch (e) {
          if (tokenURI.includes('uploads/')) {
            imageUrl = tokenURI;
            images = [tokenURI];
          }
        }
      }
    } catch (e) {
      // tokenURI may not exist; skip enrichment
    }

    return {
      tokenId,
      price: ethers.formatEther(item.price),
      category: this.getCategoryName(item.category),
      categoryId: item.category,
      seller: item.seller,
      owner: item.owner,
      sold: item.sold,
      createdAt: new Date(Number(item.createdAt) * 1000).toISOString(),
      royalty: Number(item.royalty) / 100,
      tokenURI,
      title,
      description,
      imageUrl,
      images,
      modelUrl,
    };
  }

  async getTokensByCategory(category) {
    try {
      if (!this.isReady()) throw new Error('Web3 Manager not initialized');

      const categoryId = this.getCategoryId(category);
      const tokenIds = await this.contract.getTokensByCategory(categoryId);

      return {
        success: true,
        tokenIds: tokenIds.map(id => Number(id)),
        category: this.getCategoryName(categoryId),
        count: tokenIds.length,
      };
    } catch (error) {
      console.error('Error fetching tokens by category:', error.message);
      return { success: false, error: error.message, tokenIds: [] };
    }
  }

  async getMarketplaceStats() {
    try {
      if (!this.isReady()) throw new Error('Web3 Manager not initialized');

      const stats = await this.contract.getMarketplaceStats();
      const formattedStats = {
        totalItems: Number(stats.totalItems),
        totalSold: Number(stats.totalSold),
        totalActive: Number(stats.totalActive),
        totalValue: ethers.formatEther(stats.totalValue),
        listingPrice: ethers.formatEther(this.LISTING_PRICE),
        platformFee: `${this.PLATFORM_FEE_BPS / 100}%`,
      };

      return { success: true, stats: formattedStats };
    } catch (error) {
      console.error('Error fetching marketplace stats:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getUserTokens(userAddress) {
    try {
      if (!this.isReady()) throw new Error('Web3 Manager not initialized');

      const tokenIds = await this.contract.getUserTokens(userAddress);
      return { success: true, tokenIds: tokenIds.map(id => Number(id)), count: tokenIds.length };
    } catch (error) {
      console.error('Error fetching user tokens:', error.message);
      return { success: false, error: error.message, tokenIds: [] };
    }
  }

  // ========== Helpers ==========

  getCategoryId(category) {
    if (typeof category === 'number') return category;

    if (typeof category === 'string') {
      for (const [id, name] of Object.entries(this.categories)) {
        if (name.toLowerCase() === category.toLowerCase()) return parseInt(id);
      }
      const parsed = parseInt(category);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }

    return 10; // default to 'Utility'
  }

  getCategoryName(categoryId) {
    return this.categories[categoryId] || 'Unknown';
  }

  getAvailableCategories() {
    return { ...this.categories };
  }

  isReady() {
    return this.initialized && this.contract !== null;
  }

  async getNetworkInfo() {
    if (!this.provider) return null;
    try {
      const network = await this.provider.getNetwork();
      const balance = await this.signer.getBalance();
      const address = await this.signer.getAddress();

      return {
        chainId: Number(network.chainId),
        name: network.name,
        address,
        balance: ethers.formatEther(balance),
        contractAddress: this.contractAddress,
        listingPrice: ethers.formatEther(this.LISTING_PRICE),
      };
    } catch (error) {
      console.error('Error getting network info:', error.message);
      return null;
    }
  }



  getContractConstants() {
    return {
      LISTING_PRICE: ethers.formatEther(this.LISTING_PRICE),
      LISTING_PRICE_WEI: this.LISTING_PRICE.toString(),
      MAX_BATCH_SIZE: this.MAX_BATCH_SIZE,
      PLATFORM_FEE_PERCENTAGE: this.PLATFORM_FEE_BPS / 100,
      PLATFORM_FEE_BPS: this.PLATFORM_FEE_BPS,
    };
  }
}

module.exports = Web3Manager;

// singleton convenience export
const web3Manager = new Web3Manager();
module.exports.web3Manager = web3Manager;

module.exports.utils = {
  formatEther: ethers.formatEther,
  parseEther: ethers.parseEther,
  isAddress: ethers.isAddress,
  getAddress: ethers.getAddress,
};
