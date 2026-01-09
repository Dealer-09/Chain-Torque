const { web3Manager: web3 } = require('../web3');
const MarketItem = require('../models/MarketItem');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { ethers } = require('ethers');

class EventListener {
    constructor() {
        this.isListening = false;
    }

    async start() {
        if (this.isListening) {
            console.log('[EventListener] Already listening.');
            return;
        }

        // Wait for Web3 to be ready
        if (!web3.isReady()) {
            console.log('[EventListener] Web3 not ready. Retrying in 5s...');
            setTimeout(() => this.start(), 5000);
            return;
        }

        try {
            console.log('[EventListener] Starting blockchain event listeners...');

            // Contract instance
            const contract = web3.contract;

            // 1. Listen for MarketItemCreated
            // Event: event MarketItemCreated(uint256 indexed tokenId, address seller, address owner, uint256 price, bool sold);
            // OR depending on contract version: MarketItemCreated(uint256 indexed tokenId, address seller, uint128 price, uint32 categoryId, uint256 timestamp)
            // We'll rely on what we saw in web3.js logs: MarketItemCreated(uint256,address,uint128,uint32,uint256)

            contract.on('MarketItemCreated', async (tokenId, seller, price, categoryId, timestamp, event) => {
                try {
                    console.log(`[EventListener] New Item Detected: #${tokenId}`);

                    const exists = await MarketItem.findOne({ tokenId: Number(tokenId) });
                    if (exists) {
                        console.log(`[EventListener] Item #${tokenId} already in DB. Skipping.`);
                        return;
                    }

                    // If not in DB, we need to fetch metadata to create it
                    // This happens if the frontend crashed before calling /sync-creation
                    console.log(`[EventListener] Item #${tokenId} missing from DB. Attempting auto-sync...`);

                    const tokenURI = await contract.tokenURI(tokenId);
                    let title = `NFT #${tokenId}`;
                    let description = '';
                    let imageUrl = '';
                    let modelUrl = '';
                    let images = [];

                    // Fetch IPFS Metadata
                    if (tokenURI.startsWith('http') || tokenURI.startsWith('ipfs')) {
                        const url = tokenURI.startsWith('ipfs://')
                            ? tokenURI.replace('ipfs://', 'https://gateway.lighthouse.storage/ipfs/')
                            : tokenURI;

                        try {
                            const res = await fetch(url);
                            if (res.ok) {
                                const meta = await res.json();
                                title = meta.name || title;
                                description = meta.description || description;
                                imageUrl = meta.image || '';
                                modelUrl = meta.animation_url || meta.model || '';
                                images = meta.images || (meta.image ? [meta.image] : []);
                            }
                        } catch (e) {
                            console.error('[EventListener] Metadata fetch failed:', e.message);
                        }
                    }

                    const newItem = new MarketItem({
                        tokenId: Number(tokenId),
                        title,
                        description,
                        price: Number(ethers.formatEther(price)),
                        category: web3.getCategoryName(Number(categoryId)),
                        imageUrl,
                        images,
                        modelUrl,
                        tokenURI,
                        seller: seller.toLowerCase(),
                        owner: seller.toLowerCase(), // Initially owner is seller
                        creator: seller.toLowerCase(),
                        username: 'Creator (Auto-Synced)', // We don't know the username from blockchain
                        status: 'active',
                        transactionHash: event.log.transactionHash,
                        blockNumber: event.log.blockNumber
                    });

                    await newItem.save();
                    console.log(`[EventListener] Successfully auto-synced Item #${tokenId}`);

                } catch (err) {
                    console.error('[EventListener] Error processing MarketItemCreated:', err);
                }
            });

            // 2. Listen for MarketItemSold
            // Event: MarketItemSold(uint256 indexed tokenId, address seller, address owner, uint256 price);
            contract.on('MarketItemSold', async (tokenId, seller, buyer, price, event) => {
                try {
                    console.log(`[EventListener] Sale Detected: #${tokenId} sold to ${buyer}`);

                    const item = await MarketItem.findOne({ tokenId: Number(tokenId) });
                    if (!item) {
                        console.warn(`[EventListener] Sold item #${tokenId} not found in DB!`);
                        return;
                    }

                    if (item.status === 'sold') {
                        console.log(`[EventListener] Item #${tokenId} already marked sold. Skipping.`);
                        return;
                    }

                    // Update Item
                    item.status = 'sold';
                    item.owner = buyer.toLowerCase();
                    item.soldAt = new Date();
                    await item.save();

                    console.log(`[EventListener] Updated Item #${tokenId} to SOLD.`);

                    // Record Transaction
                    const txExists = await Transaction.findOne({ transactionHash: event.log.transactionHash });
                    if (!txExists) {
                        const newTx = new Transaction({
                            transactionHash: event.log.transactionHash,
                            blockNumber: event.log.blockNumber,
                            tokenId: Number(tokenId),
                            contractAddress: contract.target,
                            type: 'purchase',
                            price: Number(ethers.formatEther(price)),
                            currency: 'ETH',
                            buyer: buyer.toLowerCase(),
                            seller: seller.toLowerCase(),
                            status: 'confirmed',
                            metadata: {
                                tokenURI: item.tokenURI,
                                title: item.title,
                                category: item.category,
                                imageUrl: item.imageUrl
                            },
                            confirmedAt: new Date()
                        });
                        await newTx.save();
                        console.log(`[EventListener] Recorded transaction for #${tokenId}`);
                    }

                    // Update User Stats
                    await this.updateStats(seller.toLowerCase(), buyer.toLowerCase(), Number(ethers.formatEther(price)));

                } catch (err) {
                    console.error('[EventListener] Error processing MarketItemSold:', err);
                }
            });

            this.isListening = true;
            console.log('✅ [EventListener] Listening for events...');

        } catch (error) {
            console.error('[EventListener] Start failed:', error);
            setTimeout(() => this.start(), 10000);
        }
    }

    async updateStats(sellerAddr, buyerAddr, priceEth) {
        try {
            // Update Buyer
            await User.updateOne(
                { walletAddress: buyerAddr },
                { $inc: { 'stats.totalPurchased': 1, 'stats.totalSpent': priceEth } },
                { upsert: true }
            );

            // Update Seller (if not contract/null)
            if (sellerAddr && !/^0x0+$/.test(sellerAddr)) {
                await User.updateOne(
                    { walletAddress: sellerAddr },
                    { $inc: { 'stats.totalSold': 1, 'stats.totalEarned': priceEth * 0.975 } }
                );
            }
        } catch (e) {
            console.error('[EventListener] Stats update failed:', e);
        }
    }
}

module.exports = new EventListener();
