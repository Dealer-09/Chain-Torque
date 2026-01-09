const mongoose = require('mongoose');

const MarketItemSchema = new mongoose.Schema({
    tokenId: {
        type: Number,
        required: true,
        unique: true,
        index: true
    },

    // Metadata
    title: { type: String, required: true },
    description: String,
    category: { type: String, default: 'Other', index: true },
    price: { type: Number, required: true }, // In ETH

    // Media
    imageUrl: String,
    images: [String],
    modelUrl: String,
    tokenURI: String,

    // Ownership
    seller: { type: String, required: true, lowercase: true, index: true },
    owner: { type: String, lowercase: true, index: true }, // Current owner
    creator: { type: String, lowercase: true }, // Original minter
    username: { type: String, default: 'Creator' }, // Display name from Clerk

    // Status
    status: {
        type: String,
        enum: ['active', 'sold', 'canceled'],
        default: 'active',
        index: true
    },

    // Blockchain Data
    transactionHash: String,
    blockNumber: Number,
    createdAt: { type: Date, default: Date.now },
    soldAt: Date,

    // IPFS / Storage
    storage: { type: String, default: 'ipfs' },
    isPermanent: { type: Boolean, default: true }
}, {
    timestamps: true,
    collection: 'marketitems'
});

// Indexes for common queries
MarketItemSchema.index({ status: 1, createdAt: -1 }); // Homepage feed
MarketItemSchema.index({ seller: 1, status: 1 }); // User selling profile

module.exports = mongoose.model('MarketItem', MarketItemSchema);
