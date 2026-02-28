// server.js (Refactored Phase 2)

// Suppress Node.js warnings in development
if (process.env.NODE_ENV !== 'production') {
  process.removeAllListeners('warning');
  process.on('warning', () => { });
}

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const { web3Manager: web3, utils: web3Utils } = require('./web3');

// Load environment variables
// In production (Render), env vars are injected directly
// In development, load from parent folder's .env
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    // Local development
    'http://localhost:8080',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5000',
    // Production (Render)
    'https://chaintorque-landing.onrender.com',
    'https://chaintorque-marketplace.onrender.com',
    'https://chaintorque-cad.onrender.com',
    'https://chaintorque-backend.onrender.com',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
}));
// JSON body parser - skip multipart/form-data (file uploads handled by multer)
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return next(); // Skip JSON parsing for file uploads
  }
  express.json({ limit: '50mb' })(req, res, next);
});
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'ChainTorque Backend is running',
    timestamp: new Date().toISOString(),
  });
});

// Routes
const marketplaceRoutes = require('./routes/marketplace');
const userRoutes = require('./routes/user');

app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/user', userRoutes);

// Web3 status endpoint
app.get('/api/web3/status', (req, res) => {
  try {
    if (web3.isReady()) {
      res.json({
        success: true,
        connected: true,
        chainId: 31337,
        contractAddress: web3.contractAddress,
        contractDeployed: true,
        signerAddress: web3.signer?.address || null,
        listingPrice: web3.getContractConstants().LISTING_PRICE,
        message: 'Web3 connected',
      });
    } else {
      res.json({ success: false, connected: false, message: 'Web3 not initialized' });
    }
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// Balance endpoint
app.get('/api/web3/balance/:address', async (req, res) => {
  const userAddress = req.params.address;
  try {
    if (!web3.isReady()) throw new Error('Web3 not initialized');
    const balance = await web3.provider.getBalance(userAddress);
    res.json({ success: true, address: userAddress, balance: web3Utils.formatEther(balance) });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// Sync Logic (Still needed on startup)
const MarketItem = require('./models/MarketItem');

async function syncBlockchainToDB() {
  try {
    if (!web3.isReady()) return;
    console.log('🔄 Syncing Blockchain to Database (Detailed)...');
    // We need ALL items (Sold + Active) to populate user profiles correctly
    const result = await web3.getAllMarketItems();
    console.log(`[DEBUG] Sync fetched ${result.items?.length || 0} items from chain. Success: ${result.success}`);

    if (result.success && Array.isArray(result.items)) {
      let newCount = 0;
      for (const item of result.items) {
        const exists = await MarketItem.findOne({ tokenId: item.tokenId });
        if (exists) {
          // Check for differences and update if needed
          const chainStatus = item.sold ? 'sold' : 'active';
          if (exists.status !== chainStatus || (item.owner && exists.owner !== item.owner.toLowerCase())) {
            console.log(`[SYNC] Updating Item #${item.tokenId}: Status ${exists.status}->${chainStatus}, Owner ${exists.owner}->${item.owner}`);
            exists.status = chainStatus;
            exists.owner = item.owner ? item.owner.toLowerCase() : exists.owner;
            if (chainStatus === 'sold' && !exists.soldAt) {
              exists.soldAt = new Date(); // Approximate
            }
            await exists.save();
          }
        }
        if (!exists) {
          await MarketItem.create({
            tokenId: item.tokenId,
            title: item.title || `NFT #${item.tokenId}`,
            description: item.description,
            price: parseFloat(item.price),
            category: item.category,
            seller: item.seller.toLowerCase(),
            owner: item.owner ? item.owner.toLowerCase() : null,
            status: item.sold ? 'sold' : 'active',
            tokenURI: item.tokenURI,
            imageUrl: item.imageUrl,
            modelUrl: item.modelUrl,
            createdAt: item.createdAt,
            storage: item.tokenURI?.startsWith('http') ? 'ipfs' : 'local'
          });
          newCount++;
        }
      }
      if (newCount > 0) console.log(`✅ Synced ${newCount} new items from Blockchain.`);
      else console.log('✅ Database is up to date.');
    }
  } catch (error) {
    console.error('Sync failed:', error.message);
  }
}

// Database Connection
async function connectDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI not found');
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('MongoDB Atlas connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
  }
}

async function initializeServices() {
  try {
    await connectDatabase();
    await web3.initialize();

    await syncBlockchainToDB();

    // Start Blockchain Event Listener
    const eventListener = require('./services/eventListener');
    eventListener.start();
  } catch (error) {
    console.error('Service initialization failed:', error.message);
  }
}

app.listen(PORT, () => {
  console.log(`ChainTorque Backend started on port ${PORT}`);
  initializeServices();
});