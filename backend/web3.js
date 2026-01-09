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

  async createMarketItem(itemData) {
    try {
      if (!this.isReady()) throw new Error('Web3 Manager not initialized');

      const { tokenURI, price, category, royalty = 0 } = itemData;
      if (!tokenURI || !price) throw new Error('Token URI and price are required');

      const categoryId = this.getCategoryId(category);
      const priceWei = ethers.parseEther(price.toString());
      const royaltyBps = Math.floor(royalty * 100); // percentage -> basis points

      const tx = await this.contract.createToken(
        tokenURI,
        priceWei,
        categoryId,
        royaltyBps,
        {
          value: this.LISTING_PRICE,
          gasLimit: 500000,
        }
      );

      const receipt = await tx.wait();

      // DEBUG: Log receipt details
      console.log('[DEBUG] Transaction Hash:', tx.hash);
      console.log('[DEBUG] Receipt Status:', receipt.status);
      console.log('[DEBUG] Logs Count:', receipt.logs.length);
      console.log('[DEBUG] Contract Address:', this.contractAddress);

      // Log each event topic for debugging
      for (let i = 0; i < receipt.logs.length; i++) {
        const log = receipt.logs[i];
        console.log(`[DEBUG] Log ${i}: address=${log.address}, topic0=${log.topics[0]}`);
      }

      // Calculate expected topic for comparison
      const expectedTopic = ethers.id('MarketItemCreated(uint256,address,uint128,uint32,uint256)');
      console.log('[DEBUG] Expected MarketItemCreated topic:', expectedTopic);

      // Robustly extract tokenId using contract interface
      let tokenId = null;
      for (const log of receipt.logs) {
        try {
          const parsedLog = this.contract.interface.parseLog(log);
          console.log('[DEBUG] Parsed log name:', parsedLog?.name);
          if (parsedLog && parsedLog.name === 'MarketItemCreated') {
            tokenId = Number(parsedLog.args.tokenId);
            console.log('[DEBUG] Found tokenId:', tokenId);
            break;
          }
        } catch (e) {
          // Log not from this contract or parsing failed (expected for some logs)
          console.log('[DEBUG] Parse failed for log:', log.topics[0], 'Error:', e.message);
          continue;
        }
      }

      if (tokenId === null) {
        console.error('[DEBUG] FAILED: No MarketItemCreated event found in', receipt.logs.length, 'logs');
        throw new Error('Transaction succeeded but MarketItemCreated event occurred not found. Could not retrieve Token ID.');
      }

      return {
        success: true,
        tokenId,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        listingFee: ethers.formatEther(this.LISTING_PRICE),
      };
    } catch (error) {
      console.error('Error creating market item:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create multiple marketplace items in one transaction.
   */
  async batchCreateMarketItems(itemsData) {
    try {
      if (!this.isReady()) throw new Error('Web3 Manager not initialized');

      if (!Array.isArray(itemsData) || itemsData.length === 0) {
        throw new Error('Items data must be a non-empty array');
      }
      if (itemsData.length > this.MAX_BATCH_SIZE) {
        throw new Error(`Batch size cannot exceed ${this.MAX_BATCH_SIZE}`);
      }

      const tokenURIs = [];
      const prices = [];
      const categories = [];
      const royalties = [];

      for (const item of itemsData) {
        const { tokenURI, price, category, royalty = 0 } = item;
        if (!tokenURI || !price) throw new Error('Each item must have tokenURI and price');

        tokenURIs.push(tokenURI);
        prices.push(ethers.parseEther(price.toString()));
        categories.push(this.getCategoryId(category));
        royalties.push(Math.floor(royalty * 100));
      }

      const totalListingFee = this.LISTING_PRICE * BigInt(itemsData.length);

      const tx = await this.contract.batchCreateTokens(
        tokenURIs,
        prices,
        categories,
        royalties,
        {
          value: totalListingFee,
          gasLimit: 500000 + itemsData.length * 300000,
        }
      );

      const receipt = await tx.wait();

      const batchEventTopic = ethers.id('BatchItemsCreated(uint256,uint256,address)');
      const batchEvent = receipt.logs.find(log => log.topics[0] === batchEventTopic);

      let startTokenId = null;
      if (batchEvent) {
        startTokenId = parseInt(batchEvent.topics[1], 16);
      }

      return {
        success: true,
        count: itemsData.length,
        startTokenId,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        totalListingFee: ethers.formatEther(totalListingFee),
        gasSavings: `~${Math.floor(itemsData.length * 0.8 * 100)}% vs individual transactions`,
      };
    } catch (error) {
      console.error('Error creating batch market items:', error.message);
      return { success: false, error: error.message };
    }
  }

  async purchaseToken(tokenId, expectedPrice) {
    try {
      if (!this.isReady()) throw new Error('Web3 Manager not initialized');

      const marketItem = await this.contract.getMarketItem(tokenId);
      if (marketItem.sold) throw new Error('Item is already sold');

      const itemPrice = marketItem.price;

      if (expectedPrice && ethers.parseEther(expectedPrice.toString()) !== itemPrice) {
        throw new Error('Price has changed. Please refresh and try again.');
      }

      const tx = await this.contract.purchaseToken(tokenId, {
        value: itemPrice,
        gasLimit: 300000,
      });

      const receipt = await tx.wait();

      return {
        success: true,
        tokenId,
        price: ethers.formatEther(itemPrice),
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      console.error('Error purchasing token:', error.message);
      return { success: false, error: error.message };
    }
  }

  async relistItem(tokenId, price) {
    try {
      if (!this.isReady()) throw new Error('Web3 Manager not initialized');
      if (!price || price <= 0) throw new Error('Price must be positive');

      const priceWei = ethers.parseEther(price.toString());

      const tx = await this.contract.relistToken(tokenId, priceWei, {
        value: this.LISTING_PRICE, // Pay listing fee again
        gasLimit: 300000,
      });

      const receipt = await tx.wait();

      return {
        success: true,
        tokenId,
        price,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      console.error('Error relisting token:', error.message);
      return { success: false, error: error.message };
    }
  }

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

      // Fetch all items one by one (or in batches if supported, but loop is fine for <1000 items)
      // Parallelize for speed
      const promises = [];
      for (let i = 1; i <= currentTokenId; i++) {
        promises.push(this.contract.getMarketItem(i).catch(e => null));
      }

      const rawItems = await Promise.all(promises);

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

  async estimateGas(operation, params = []) {
    if (!this.isReady()) return null;

    try {
      let gasEstimate;

      switch (operation) {
        case 'createToken':
          gasEstimate = await this.contract.createToken.estimateGas(...params, {
            value: this.LISTING_PRICE,
          });
          break;
        case 'batchCreateTokens':
          const batchSize = params[0]?.length || 1;
          const totalValue = this.LISTING_PRICE * BigInt(batchSize);
          gasEstimate = await this.contract.batchCreateTokens.estimateGas(
            ...params,
            { value: totalValue }
          );
          break;
        case 'purchaseToken':
          const tokenId = params[0];
          const marketItem = await this.contract.getMarketItem(tokenId);
          gasEstimate = await this.contract.purchaseToken.estimateGas(tokenId, {
            value: marketItem.price,
          });
          break;
        default:
          return null;
      }

      return {
        gasLimit: gasEstimate.toString(),
        gasLimitHex: `0x${gasEstimate.toString(16)}`,
        estimatedCost: ethers.formatEther(gasEstimate * 20000000000n), // assuming 20 gwei
      };
    } catch (error) {
      console.error(`Error estimating gas for ${operation}:`, error.message);
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
