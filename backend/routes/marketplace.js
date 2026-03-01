const express = require('express');
const router = express.Router();
const path = require('path');
const MarketItem = require('../models/MarketItem');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const upload = require('../middleware/upload');
const { ethers } = require('ethers');
const { web3Manager: web3 } = require('../web3'); // Using singleton
const { uploadFile, uploadMetadata } = require('../services/lighthouseStorage');

// Marketplace items endpoint
router.get('/', async (req, res) => {
    try {
        // Fetch from MongoDB
        const items = await MarketItem.find({ status: 'active' }).sort({ createdAt: -1 });

        console.log(`[Marketplace GET] Returning ${items.length} active items. TokenIds: [${items.map(i => i.tokenId).join(', ')}]`);

        res.json({
            success: true,
            data: items,
            total: items.length,
            source: 'database',
        });
    } catch (error) {
        console.error('Marketplace fetch error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error fetching marketplace items',
            error: error.message,
        });
    }
});



// ============================================================
// DECENTRALIZED UPLOAD FLOW ENDPOINTS
// ============================================================

// Upload files to IPFS only (no blockchain minting)
// User will call smart contract directly from frontend after getting tokenURI
router.post('/upload-files', (req, res, next) => {
    // Wrap multer to catch errors and return JSON instead of HTML
    const uploadMiddleware = upload.fields([
        { name: 'image', maxCount: 10 },
        { name: 'model', maxCount: 1 },
    ]);

    uploadMiddleware(req, res, (err) => {
        if (err) {
            console.error('[Upload] Multer error:', err.message);
            return res.status(400).json({
                success: false,
                message: err.message || 'File upload error',
                error: err.message
            });
        }
        next();
    });
}, async (req, res) => {
    try {
        const { title, description, category } = req.body;
        const imageFiles = req.files?.image || [];
        const modelFile = req.files?.model ? req.files.model[0] : null;

        if (!imageFiles.length) {
            return res.status(400).json({ success: false, message: 'At least one image file is required' });
        }

        // Upload images to IPFS
        console.log('[IPFS] Uploading images...');
        const imageUploads = [];
        for (const img of imageFiles) {
            const uploaded = await uploadFile(img.path);
            imageUploads.push(uploaded.url);
        }

        // Upload model if present
        let modelUpload = { cid: '', url: '' };
        if (modelFile) {
            console.log('[IPFS] Uploading model...');
            modelUpload = await uploadFile(modelFile.path);
        }

        // Create metadata and upload to IPFS
        const metadata = {
            name: title,
            description,
            image: imageUploads[0],
            images: imageUploads,
            animation_url: modelUpload.url,
            external_url: `${req.protocol}://${req.get('host')}`,
            attributes: [
                { trait_type: 'Category', value: category },
                { trait_type: 'File Type', value: modelFile ? path.extname(modelFile.originalname).toUpperCase() : '' },
                { trait_type: 'Created', value: new Date().toISOString().split('T')[0] },
                { trait_type: 'Marketplace', value: 'ChainTorque' },
            ],
            properties: {
                category,
                files: [
                    ...imageUploads.map(url => ({ uri: url, type: 'image' })),
                    ...(modelFile ? [{ uri: modelUpload.url, type: 'model' }] : []),
                ],
            },
        };

        console.log('[IPFS] Uploading metadata...');
        const metadataUpload = await uploadMetadata(metadata);

        // Legacy PendingUpload logging removed.
        // Return IPFS URLs - user will use tokenURI when calling createToken from frontend
        res.json({
            success: true,
            data: {
                tokenURI: metadataUpload.url,
                imageUrl: imageUploads[0],
                images: imageUploads,
                modelUrl: modelUpload.url,
                metadataUrl: metadataUpload.url,
            },
            message: 'Files uploaded to IPFS. Ready for on-chain minting.',
        });
    } catch (error) {
        console.error('IPFS upload error:', error.message || error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload files to IPFS',
            error: error.message,
        });
    }
}
);

// Sync creation - called after user mints NFT from frontend
router.post('/sync-creation', async (req, res) => {
    try {
        const {
            tokenId,
            transactionHash,
            walletAddress,
            title,
            description,
            category,
            price,
            imageUrl,
            images,
            modelUrl,
            tokenURI,
            username,
            royalty
        } = req.body;

        // Validate required fields
        if (!tokenId || !transactionHash || !walletAddress) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: tokenId, transactionHash, walletAddress'
            });
        }

        console.log(`[Sync Creation] Token ID ${tokenId} from wallet ${walletAddress}`);

        // Verify transaction on-chain
        if (!web3.isReady()) {
            return res.status(503).json({ success: false, message: 'Web3 provider not ready' });
        }

        let receipt;
        try {
            receipt = await web3.provider.getTransactionReceipt(transactionHash);
        } catch (e) {
            return res.status(400).json({ success: false, message: 'Invalid transaction hash format' });
        }

        if (!receipt) {
            return res.status(404).json({ success: false, message: 'Transaction not found on chain' });
        }

        if (receipt.status === 0) {
            return res.status(400).json({ success: false, message: 'Transaction failed on chain' });
        }

        // Verify MarketItemCreated event exists in the transaction
        let foundEvent = null;
        console.log(`[Sync Creation] Checking ${receipt.logs.length} logs for contract ${web3.contractAddress}`);
        for (const log of receipt.logs) {
            try {
                console.log(`[Sync Creation] Log address: ${log.address}, expected: ${web3.contractAddress}`);
                if (log.address.toLowerCase() !== web3.contractAddress.toLowerCase()) continue;
                const parsed = web3.contract.interface.parseLog(log);
                console.log(`[Sync Creation] Parsed event: ${parsed?.name}, tokenId: ${parsed?.args?.tokenId}`);
                if (parsed && parsed.name === 'MarketItemCreated') {
                    if (parsed.args.tokenId.toString() === tokenId.toString()) {
                        foundEvent = parsed;
                        break;
                    }
                }
            } catch (e) {
                console.log(`[Sync Creation] Parse error: ${e.message}`);
                continue;
            }
        }

        if (!foundEvent) {
            console.log(`[Sync Creation] ERROR: MarketItemCreated event not found for token ${tokenId}`);
            return res.status(400).json({
                success: false,
                message: 'Transaction does not contain valid MarketItemCreated event for this token.'
            });
        }

        console.log(`[Sync Creation] ✅ Found valid MarketItemCreated event for token ${tokenId}`);

        // Check if already synced (idempotent)
        console.log(`[Sync Creation] Checking if token ${tokenId} already exists in database...`);
        const existingItem = await MarketItem.findOne({ tokenId: parseInt(tokenId) });
        if (existingItem) {
            console.log(`[Sync Creation] ⚠️ Item already synced (Idempotent) - token ${tokenId}`);
            return res.json({ success: true, message: 'Item already synced (Idempotent)', tokenId });
        }

        console.log(`[Sync Creation] Token ${tokenId} not found in DB, creating new item...`);

        // Save to database with correct seller and creator address
        const newItem = new MarketItem({
            tokenId: parseInt(tokenId),
            title: title || `NFT #${tokenId}`,
            description: description || '',
            price: parseFloat(price) || 0,
            category: category || 'Other',
            imageUrl: imageUrl || '',
            images: images || [],
            modelUrl: modelUrl || '',
            tokenURI: tokenURI || '',
            seller: walletAddress.toLowerCase(), // User's wallet address - they will receive payments!
            creator: walletAddress.toLowerCase(), // Original creator - for royalties and filtering
            owner: walletAddress.toLowerCase(), // Initially owner = seller = creator
            username: username || 'Creator',
            royalty: parseFloat(royalty) || 0,
            createdAt: new Date(),
            isPermanent: true,
            storage: 'ipfs',
            transactionHash,
            blockNumber: receipt.blockNumber,
            status: 'active'
        });

        try {
            await newItem.save();
        } catch (saveError) {
            // Handle duplicate key error (E11000) - race condition with eventListener
            if (saveError.code === 11000 || saveError.message?.includes('duplicate key')) {
                console.log(`[Sync Creation] ℹ️ Item #${tokenId} already exists (race condition - returning success)`);
                return res.json({ success: true, message: 'Item already synced (Race condition handled)', tokenId });
            }
            throw saveError; // Re-throw other errors
        }

        // Update user stats (non-blocking - don't let stat update fail the sync)
        try {
            let user = await User.findByWallet(walletAddress);
            if (!user) {
                user = new User({
                    walletAddress: walletAddress.toLowerCase(),
                    isCreator: true,
                    lastActive: new Date()
                });
                await user.save();
            }
            // Use direct updateOne instead of instance method to avoid middleware issues
            await User.updateOne(
                { _id: user._id },
                { $inc: { 'stats.totalCreated': 1 } }
            );
        } catch (statError) {
            console.warn('[Sync Creation] Failed to update user stats:', statError.message);
            // Don't fail the sync just because stats update failed
        }

        console.log(`[Sync Creation] Successfully saved Token ID ${tokenId} for seller ${walletAddress}`);

        res.json({
            success: true,
            message: 'NFT creation synced successfully',
            tokenId,
            seller: walletAddress.toLowerCase()
        });

    } catch (error) {
        console.error('[Sync Creation] ERROR:', error.message);
        console.error('[Sync Creation] Stack:', error.stack);
        res.status(500).json({ success: false, error: error.message, message: 'Failed to sync NFT creation to database' });
    }
});

// Stats endpoint
router.get('/stats', async (req, res) => {
    try {
        const totalItems = await MarketItem.countDocuments({ status: 'active' });
        const totalSold = await MarketItem.countDocuments({ status: 'sold' });

        const valueAgg = await MarketItem.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: null, total: { $sum: '$price' } } }
        ]);
        const totalValue = valueAgg.length > 0 ? valueAgg[0].total : 0;

        const stats = {
            totalItems,
            totalSold,
            totalActive: totalItems,
            totalValue: totalValue.toString(),
            listingPrice: web3.getContractConstants().LISTING_PRICE,
            platformFee: `${web3.getContractConstants().PLATFORM_FEE_PERCENTAGE}%`,
            storage: 'ipfs',
        };

        res.json({ success: true, ...stats });
    } catch (error) {
        console.error('Marketplace stats error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Single Item - Auto-healing
router.get('/:id', async (req, res) => {
    const paramTokenId = req.params.id;
    try {
        let item = await MarketItem.findOne({ tokenId: paramTokenId });

        // Auto-heal: If item is active locally, check chain to ensure it hasn't been sold
        // This handles cases where the backend missed the 'MarketItemSold' event
        // Auto-heal disabled for stability

        if (item) {
            res.json({ success: true, data: item });
        } else {
            res.status(404).json({ success: false, error: 'Item not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Sync Purchase
router.post('/sync-purchase', async (req, res) => {
    try {
        const { tokenId, transactionHash, buyerAddress, price } = req.body;

        console.log('[Sync Purchase] Received:', { tokenId, transactionHash, buyerAddress, price });

        if (!tokenId || !transactionHash || !buyerAddress) {
            console.log('[Sync Purchase] Missing fields - tokenId:', !!tokenId, 'transactionHash:', !!transactionHash, 'buyerAddress:', !!buyerAddress);
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        console.log(`Syncing purchase for Token ID ${tokenId} (Tx: ${transactionHash})`);

        if (!web3.isReady()) {
            return res.status(503).json({ success: false, message: 'Web3 provider not ready' });
        }

        // 1. Verify Transaction on Chain
        let receipt;
        try {
            receipt = await web3.provider.getTransactionReceipt(transactionHash);
        } catch (e) {
            return res.status(400).json({ success: false, message: 'Invalid transaction hash format' });
        }

        if (!receipt) {
            return res.status(404).json({ success: false, message: 'Transaction not found on chain' });
        }

        if (receipt.status === 0) {
            return res.status(400).json({ success: false, message: 'Transaction failed on chain' });
        }

        // 2. Verify Event (MarketItemSold)
        // Parse logs using the contract interface to get the true price and data
        let soldEvent = null;
        let truePrice = null;

        for (const log of receipt.logs) {
            try {
                // Check if log address matches our contract (security)
                if (log.address.toLowerCase() !== web3.contractAddress.toLowerCase()) continue;

                const parsed = web3.contract.interface.parseLog(log);
                if (parsed && parsed.name === 'MarketItemSold') {
                    soldEvent = parsed;
                    // Args: tokenId, seller, buyer, price
                    // We verify tokenId again here just to be sure
                    if (parsed.args.tokenId.toString() === tokenId.toString()) {
                        truePrice = ethers.formatEther(parsed.args.price);
                        break;
                    }
                }
            } catch (e) {
                continue;
            }
        }

        if (!soldEvent || !truePrice) {
            return res.status(400).json({ success: false, message: 'Transaction does not contain valid MarketItemSold event for this token.' });
        }

        // 3. Update Database (Idempotent)
        const item = await MarketItem.findOne({ tokenId: tokenId });

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found in DB' });
        }

        if (item.status === 'sold') {
            return res.json({ success: true, message: 'Purchase already synced (Idempotent)' });
        }

        item.owner = buyerAddress.toLowerCase();
        // Note: Keep original seller address for historical records (seller is required in schema)
        // The status='sold' indicates the item is no longer for sale
        item.status = 'sold';
        item.soldAt = new Date();
        await item.save();

        // 4. Record Transaction using TRUE PRICE from Blockchain
        const transaction = new Transaction({
            transactionHash: transactionHash,
            blockNumber: receipt.blockNumber,
            tokenId: parseInt(tokenId),
            contractAddress: web3.contractAddress,
            type: 'purchase',
            price: parseFloat(truePrice),
            currency: 'ETH',
            buyer: buyerAddress.toLowerCase(),
            seller: soldEvent.args.seller.toLowerCase(), // Use event seller for truth
            gasUsed: receipt.gasUsed.toString(), // Required field - from blockchain receipt
            status: 'confirmed',
            metadata: {
                tokenURI: item.tokenURI,
                title: item.title,
                category: item.category,
                imageUrl: item.imageUrl
            },
            confirmedAt: new Date()
        });

        await transaction.save();

        // 5. Update User Stats (non-blocking - don't let stats fail the sync)
        try {
            let buyer = await User.findByWallet(buyerAddress);
            if (!buyer) {
                buyer = new User({ walletAddress: buyerAddress.toLowerCase() });
                await buyer.save();
            }
            const priceEth = parseFloat(truePrice);
            await User.updateOne(
                { _id: buyer._id },
                { $inc: { 'stats.totalPurchased': 1, 'stats.totalSpent': priceEth } }
            );

            // Calculate earnings
            const platformFeeEth = priceEth * 0.025;
            const royaltyPercentage = item.royalty || 0;
            const royaltyEth = priceEth * (royaltyPercentage / 100);
            const sellerEarnedEth = priceEth - platformFeeEth - royaltyEth;

            // Use event seller to credit the correct person
            const eventSellerAddress = soldEvent.args.seller.toLowerCase();
            if (eventSellerAddress && eventSellerAddress !== '0x0000000000000000000000000000000000000000') {
                let seller = await User.findByWallet(eventSellerAddress);
                if (seller) {
                    await User.updateOne(
                        { _id: seller._id },
                        { $inc: { 'stats.totalSold': 1, 'stats.totalEarned': sellerEarnedEth } }
                    );
                } else {
                    // Create if doesn't exist to ensure stats track
                    let newSeller = new User({ walletAddress: eventSellerAddress });
                    await newSeller.save();
                    await User.updateOne(
                        { _id: newSeller._id },
                        { $inc: { 'stats.totalSold': 1, 'stats.totalEarned': sellerEarnedEth } }
                    );
                }
            }

            // Pay royalty to original creator
            if (royaltyEth > 0 && item.creator && item.creator !== '0x0000000000000000000000000000000000000000') {
                let creatorUser = await User.findByWallet(item.creator.toLowerCase());
                if (creatorUser) {
                    await User.updateOne(
                        { _id: creatorUser._id },
                        { $inc: { 'stats.totalEarned': royaltyEth } }
                    );
                } else {
                    let newCreator = new User({ walletAddress: item.creator.toLowerCase() });
                    await newCreator.save();
                    await User.updateOne(
                        { _id: newCreator._id },
                        { $inc: { 'stats.totalEarned': royaltyEth } }
                    );
                }
            }
        } catch (statsError) {
            console.warn('[Sync Purchase] Failed to update user stats:', statsError.message);
            // Don't fail the sync just because stats update failed
        }

        res.json({ success: true, message: 'Purchase synced successfully with on-chain verification' });

    } catch (error) {
        console.error('Sync error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});



// Self-healing: Check status on-chain and update DB if needed
router.get('/sync-status/:id', async (req, res) => {
    try {
        const tokenId = req.params.id;
        if (!web3.isReady()) return res.status(503).json({ success: false, message: 'Web3 not ready' });

        // Fetch from Contract
        // Contract returns a struct arrays/objects. We need to handle potential failures (e.g. invalid ID)
        let item;
        try {
            item = await web3.contract.getMarketItem(tokenId);
        } catch (e) {
            return res.status(404).json({ success: false, message: 'Item not found on chain' });
        }

        // Fetch from DB
        const dbItem = await MarketItem.findOne({ tokenId });
        if (!dbItem) return res.status(404).json({ success: false, message: 'Item not found in DB' });

        let updated = false;

        // Detect Mismatch: on-chain SOLD vs db ACTIVE
        // Contract 'sold' is a boolean
        // Auto-heal disabled for stability

        res.json({
            success: true,
            updated,
            status: dbItem.status,
            owner: dbItem.owner,
            onChain: {
                sold: item.sold,
                owner: item.owner.toLowerCase()
            }
        });

    } catch (error) {
        console.error('Sync status error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
