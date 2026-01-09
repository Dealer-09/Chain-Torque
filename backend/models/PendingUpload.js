const mongoose = require('mongoose');

const PendingUploadSchema = new mongoose.Schema({
    // IPFS Identifiers
    tokenURI: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // File Metadata
    modelUrl: String,
    images: [String],

    // Context
    walletAddress: { type: String, lowercase: true }, // Who uploaded it?

    // Status
    status: {
        type: String,
        enum: ['pending', 'minted', 'garbage'],
        default: 'pending'
    },

    createdAt: {
        type: Date,
        default: Date.now,
        index: true  // Indexed for TTL/Cleanup queries
    }
}, {
    collection: 'pending_uploads',
    timestamps: true
});

// Optional: TTL Index to auto-delete records from DB after 7 days
// This only cleans the DB record, not the IPFS file. The script handles IPFS.
PendingUploadSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('PendingUpload', PendingUploadSchema);
