// server.js (Refactored Phase 2)

// Suppress Node.js warnings in development
if (process.env.NODE_ENV !== 'production') {
  process.removeAllListeners('warning');
  process.on('warning', () => { });
}
// const dns = require('dns');
// dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);


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
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:8081',
      'http://localhost:8082',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://localhost:5000',
      'https://chaintorque-landing.onrender.com',
      'https://chaintorque-marketplace.onrender.com',
      'https://chaintorque-cad.onrender.com',
      'https://chaintorque-backend.onrender.com',
    ];

    if (process.env.FRONTEND_URL) {
      // Split by comma to support multiple custom origins
      const customOrigins = process.env.FRONTEND_URL.split(',').map(o => o.trim());
      allowedOrigins.push(...customOrigins);
    }

    const isAllowed = allowedOrigins.includes(origin) ||
      origin.endsWith('.onrender.com') ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:');

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Rejected origin: ${origin}`);
      callback(null, false); // Block the origin, but don't crash the server process
    }
  },
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
const aiRoutes = require('./routes/ai');

app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/user', userRoutes);
app.use('/api/ai', aiRoutes);

// ============================================================
// MODEL PROXY — bypasses CORS on IPFS/Lighthouse gateway
// GET /api/proxy-model?url=<encodedUrl>
// ============================================================
app.get('/api/proxy-model', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url query param' });
  }
  try {
    const https = require('https');
    const http = require('http');
    const urlObj = new URL(targetUrl);

    // SECURITY FIX: SSRF Protection - Only allow safe IPFS gateways
    const allowedHosts = ['gateway.pinata.cloud', 'ipfs.io', 'cloudflare-ipfs.com', 'gateway.lighthouse.storage'];
    if (!allowedHosts.includes(urlObj.hostname)) {
      return res.status(403).json({ error: 'Forbidden: Invalid proxy target domain' });
    }

    const proto = urlObj.protocol === 'https:' ? https : http;

    proto.get(targetUrl, (upstream) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', upstream.headers['content-type'] || 'model/gltf-binary');
      if (upstream.headers['content-length']) {
        res.setHeader('Content-Length', upstream.headers['content-length']);
      }
      upstream.pipe(res);
    }).on('error', (err) => {
      console.error('[Proxy] Fetch error:', err.message);
      res.status(502).json({ error: 'Failed to fetch model', detail: err.message });
    });
  } catch (err) {
    res.status(400).json({ error: 'Invalid URL', detail: err.message });
  }
});

// Web3 status endpoint
app.get('/api/web3/status', async (req, res) => {
  try {
    if (web3.isReady()) {
      // Get actual chain ID from provider instead of hardcoding
      let chainId = 11155111; // Default Sepolia
      try {
        const network = await web3.provider.getNetwork();
        chainId = Number(network.chainId);
      } catch (e) {
        console.warn('[Web3 Status] Failed to get chainId from provider:', e.message);
      }
      res.json({
        success: true,
        connected: true,
        chainId,
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

// App config endpoint — single source of truth for clients (mobile + web).
// Mobile fetches this on launch so a contract redeploy never requires a rebuild.
app.get('/api/config', async (req, res) => {
  try {
    let contractAddress = web3.contractAddress || null;
    let chainId = 11155111;        // Sepolia default
    let listingPrice = '0.00025';
    let network = 'sepolia';

    // Prefer live values from the connected web3 manager.
    if (web3.isReady()) {
      try {
        const net = await web3.provider.getNetwork();
        chainId = Number(net.chainId);
      } catch (e) {
        console.warn('[Config] Failed to read chainId from provider:', e.message);
      }
      try {
        listingPrice = web3.getContractConstants().LISTING_PRICE;
      } catch (e) {
        console.warn('[Config] Failed to read listing price:', e.message);
      }
    }

    // Fall back to the deployment file so /api/config always returns an address,
    // even if web3 failed to initialise.
    if (!contractAddress) {
      try {
        const fs = require('fs');
        const path = require('path');
        const deployment = JSON.parse(
          fs.readFileSync(path.join(__dirname, 'contract-address.json'), 'utf8')
        );
        contractAddress = deployment.ChainTorqueMarketplace;
        chainId = deployment.chainId || chainId;
        listingPrice = deployment.listingPrice || listingPrice;
        network = deployment.network || network;
      } catch (e) {
        console.warn('[Config] Could not read contract-address.json:', e.message);
      }
    }

    res.json({ success: true, contractAddress, chainId, listingPrice, network });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
    console.log('🔄 Syncing Blockchain to Database (Optimized)...');
    
    const currentTokenId = Number(await web3.contract.getCurrentTokenId());
    let newCount = 0;
    
    for (let i = 1; i <= currentTokenId; i++) {
        try {
            const item = await web3.contract.getMarketItem(i);
            const exists = await MarketItem.findOne({ tokenId: i });
            const chainStatus = item.sold ? 'sold' : 'active';
            const chainOwner = item.owner.toLowerCase();
            
            if (exists) {
                if (exists.status !== chainStatus || (item.owner && exists.owner !== chainOwner)) {
                    exists.status = chainStatus;
                    exists.owner = chainOwner;
                    if (chainStatus === 'sold' && !exists.soldAt) exists.soldAt = new Date();
                    await exists.save();
                }
            } else {
                // Missing item! Only now fetch IPFS metadata
                const formatted = await web3.formatMarketItem(item);
                await MarketItem.create({
                  tokenId: formatted.tokenId,
                  title: formatted.title || `NFT #${formatted.tokenId}`,
                  description: formatted.description,
                  price: parseFloat(formatted.price),
                  category: formatted.category,
                  seller: formatted.seller.toLowerCase(),
                  owner: formatted.owner ? formatted.owner.toLowerCase() : null,
                  status: formatted.sold ? 'sold' : 'active',
                  tokenURI: formatted.tokenURI,
                  imageUrl: formatted.imageUrl,
                  modelUrl: formatted.modelUrl,
                  createdAt: formatted.createdAt,
                  storage: formatted.tokenURI?.startsWith('http') ? 'ipfs' : 'local'
                });
                newCount++;
            }
        } catch (e) {
            console.error(`[SYNC] Failed for token ${i}:`, e.message);
        }
    }
    if (newCount > 0) console.log(`✅ Synced ${newCount} new items from Blockchain.`);
    else console.log('✅ Database is up to date.');
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
    await mongoose.connect(mongoUri, { tlsAllowInvalidCertificates: true });
    console.log('MongoDB Atlas connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
  }
}

async function initializeServices() {
  try {
    await connectDatabase();
    await web3.initialize();

    // Fire and forget sync, don't block event listener
    syncBlockchainToDB();

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
