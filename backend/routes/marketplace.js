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

// Create marketplace item
router.post(
    '/create',
    upload.fields([
        { name: 'image', maxCount: 10 },
        { name: 'model', maxCount: 1 },
    ]),
    async (req, res) => {
        try {
            const { title, description, price, category, username, walletAddress } = req.body;
            const imageFiles = req.files?.image || [];
            const modelFile = req.files?.model ? req.files.model[0] : null;

            if (!imageFiles.length) {
                return res.status(400).json({ success: false, message: 'At least one image file is required' });
            }

            if (!web3.isReady()) {
                throw new Error('Web3 not ready. Cannot mint NFT.');
            }

            // Upload images
            const imageUploads = [];
            for (const img of imageFiles) {
                const uploaded = await uploadFile(img.path);
                imageUploads.push(uploaded.url);
            }

            // Upload model if present
            let modelUpload = { cid: '', url: '' };
            if (modelFile) {
                modelUpload = await uploadFile(modelFile.path);
            }

            // Create metadata and upload
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
                    { trait_type: 'Author', value: username || 'Creator' }, // Persist name to IPFS
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

            const metadataUpload = await uploadMetadata(metadata);

            const ipfsResult = {
                tokenURI: metadataUpload.url,
                imageUrl: imageUploads[0],
                images: imageUploads,
                modelUrl: modelUpload.url,
                metadataUrl: metadataUpload.url,
            };

            // Mint NFT on blockchain
            const blockchainResult = await web3.createMarketItem({
                tokenURI: ipfsResult.tokenURI,
                price: parseFloat(price),
                category,
                royalty: 0,
            });

            let tokenId = blockchainResult.tokenId;

            if (tokenId === undefined || tokenId === null) {
                throw new Error(`Failed to retrieve Token ID from blockchain transaction. Result: ${JSON.stringify(blockchainResult)}`);
            }

            const newItem = new MarketItem({
                tokenId,
                title,
                description,
                price: parseFloat(price),
                category,
                imageUrl: ipfsResult.imageUrl,
                images: ipfsResult.images,
                modelUrl: ipfsResult.modelUrl,
                tokenURI: ipfsResult.tokenURI,
                seller: walletAddress ? walletAddress.toLowerCase() : (blockchainResult.seller ? blockchainResult.seller.toLowerCase() : 'unknown'),
                username: username || 'Unknown Creator',
                createdAt: new Date(),
                isPermanent: true,
                storage: 'ipfs',
                transactionHash: blockchainResult.transactionHash,
                blockNumber: blockchainResult.blockNumber,
                status: 'active'
            });

            await newItem.save();

            res.json({
                success: true,
                ...ipfsResult,
                ...blockchainResult,
                message: 'NFT Created & Saved to DB',
                storage: 'ipfs',
                isPermanent: true,
                tokenId,
            });
        } catch (error) {
            console.error('NFT creation error:', error.message || error);
            res.status(500).json({
                success: false,
                message: 'Failed to create NFT',
                error: error.message,
            });
        }
    }
);

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

        // [Storage Optimization] Log this upload to DB
        const PendingUpload = require('../models/PendingUpload');

        // Use findOneAndUpdate with upsert to avoid duplicate key errors
        await PendingUpload.findOneAndUpdate(
            { tokenURI: metadataUpload.url },
            {
                tokenURI: metadataUpload.url,
                modelUrl: modelUpload.url,
                images: imageUploads,
                status: 'pending',
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );
        console.log(`[Storage] Logged pending upload: ${metadataUpload.url}`);

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
            username
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
            return res.status(400).json({
                success: false,
                message: 'Transaction does not contain valid MarketItemCreated event for this token.'
            });
        }

        // Check if already synced (idempotent)
        const existingItem = await MarketItem.findOne({ tokenId: parseInt(tokenId) });
        if (existingItem) {
            return res.json({ success: true, message: 'Item already synced (Idempotent)', tokenId });
        }

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
            createdAt: new Date(),
            isPermanent: true,
            storage: 'ipfs',
            transactionHash,
            blockNumber: receipt.blockNumber,
            status: 'active'
        });

        await newItem.save();

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
        console.error('Sync creation error:', error.message);
        res.status(500).json({ success: false, error: error.message });
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
            await User.updateOne(
                { _id: buyer._id },
                { $inc: { 'stats.totalPurchased': 1, 'stats.totalSpent': parseFloat(truePrice) } }
            );

            // Use event seller to credit the correct person
            const eventSellerAddress = soldEvent.args.seller.toLowerCase();
            if (eventSellerAddress && eventSellerAddress !== '0x0000000000000000000000000000000000000000') {
                let seller = await User.findByWallet(eventSellerAddress);
                if (seller) {
                    await User.updateOne(
                        { _id: seller._id },
                        { $inc: { 'stats.totalSold': 1, 'stats.totalEarned': parseFloat(truePrice) * 0.975 } }
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

// Legacy Purchase
router.post('/purchase', async (req, res) => {
    try {
        const { tokenId, buyerAddress, price } = req.body;

        if (!tokenId || !buyerAddress || !price) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: tokenId, buyerAddress, price'
            });
        }

        if (!web3.isReady()) {
            throw new Error('Web3 not ready. Cannot process purchase.');
        }

        const item = await MarketItem.findOne({ tokenId });
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        if (item.seller.toLowerCase() === buyerAddress.toLowerCase()) {
            return res.status(400).json({ success: false, message: 'Cannot buy your own item' });
        }

        let buyer = await User.findByWallet(buyerAddress);
        if (!buyer) {
            buyer = new User({
                walletAddress: buyerAddress.toLowerCase(),
                lastActive: new Date()
            });
            await buyer.save();
        }

        let seller = await User.findByWallet(item.seller);
        if (!seller) {
            seller = new User({
                walletAddress: item.seller.toLowerCase(),
                isCreator: true,
                lastActive: new Date()
            });
            await seller.save();
        }

        const blockchainResult = await web3.purchaseToken(tokenId, price);

        if (!blockchainResult.success) {
            throw new Error(blockchainResult.error || 'Blockchain purchase failed');
        }

        const transaction = new Transaction({
            transactionHash: blockchainResult.transactionHash,
            blockNumber: blockchainResult.blockNumber,
            tokenId: parseInt(tokenId),
            contractAddress: web3.contractAddress,
            type: 'purchase',
            price: parseFloat(price),
            currency: 'ETH',
            buyer: buyerAddress.toLowerCase(),
            seller: item.seller.toLowerCase(),
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

        item.owner = buyerAddress.toLowerCase();
        // Keep original seller for history (seller is required field)
        item.status = 'sold';
        await item.save();

        await buyer.incrementStat('totalPurchased', 1);
        await buyer.incrementStat('totalSpent', parseFloat(price));
        await seller.incrementStat('totalSold', 1);
        await seller.incrementStat('totalEarned', parseFloat(price) * 0.975);

        res.json({
            success: true,
            ...blockchainResult,
            message: 'Purchase successful (Legacy Mode)',
        });
    } catch (error) {
        console.error('Purchase error:', error.message);
        res.status(500).json({ success: false, message: 'Purchase failed', error: error.message });
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
        // Detect Mismatch: on-chain SOLD vs db ACTIVE
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
