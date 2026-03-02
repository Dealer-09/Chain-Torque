const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  // Transaction identifiers
  transactionHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  blockNumber: {
    type: Number,
    required: true
  },
  
  // NFT Details
  tokenId: {
    type: Number,
    required: true,
    index: true
  },
  contractAddress: {
    type: String,
    required: true
  },
  
  // Transaction Details
  type: {
    type: String,
    enum: ['mint', 'purchase', 'transfer', 'listing', 'relist'],
    required: true,
    index: true
  },
  price: {
    type: Number,
    required: function() { return ['purchase', 'listing', 'relist'].includes(this.type); }
  },
  currency: {
    type: String,
    default: 'ETH'
  },
  
  // Parties involved
  buyer: {
    type: String,
    required: function() { return this.type === 'purchase'; },
    index: true
  },
  seller: {
    type: String,
    required: function() { return this.type === 'purchase' || this.type === 'listing'; },
    index: true
  },
  creator: {
    type: String,
    required: function() { return this.type === 'mint'; }
  },
  
  // Gas and fees
  gasUsed: {
    type: String,
    required: true
  },
  gasPrice: {
    type: String
  },
  platformFee: {
    type: Number,
    default: 0
  },
  royaltyFee: {
    type: Number,
    default: 0
  },
  
  // Additional metadata
  metadata: {
    tokenURI: String,
    title: String,
    description: String,
    category: String,
    imageUrl: String,
    modelUrl: String
  },
  
  // Status and timestamps
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending',
    index: true
  },
  confirmations: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  confirmedAt: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'transactions'
});

// Indexes for better query performance
TransactionSchema.index({ buyer: 1, createdAt: -1 });
TransactionSchema.index({ seller: 1, createdAt: -1 });
TransactionSchema.index({ tokenId: 1, type: 1 });
TransactionSchema.index({ type: 1, status: 1, createdAt: -1 });

// Instance methods
TransactionSchema.methods.markAsConfirmed = function() {
  this.status = 'confirmed';
  this.confirmedAt = new Date();
  return this.save();
};

TransactionSchema.methods.incrementConfirmations = function() {
  this.confirmations += 1;
  if (this.confirmations >= 3 && this.status === 'pending') {
    this.status = 'confirmed';
    this.confirmedAt = new Date();
  }
  return this.save();
};

// Static methods
TransactionSchema.statics.findByUser = function(userAddress) {
  return this.find({
    $or: [
      { buyer: userAddress },
      { seller: userAddress },
      { creator: userAddress }
    ]
  }).sort({ createdAt: -1 });
};

TransactionSchema.statics.findPurchasesByToken = function(tokenId) {
  return this.find({ 
    tokenId: tokenId, 
    type: 'purchase',
    status: 'confirmed'
  }).sort({ createdAt: -1 });
};

TransactionSchema.statics.getMarketplaceStats = function() {
  return this.aggregate([
    {
      $match: { 
        type: 'purchase', 
        status: 'confirmed' 
      }
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: 1 },
        totalVolume: { $sum: '$price' },
        averagePrice: { $avg: '$price' },
        totalFees: { $sum: { $add: ['$platformFee', '$royaltyFee'] } }
      }
    }
  ]);
};

module.exports = mongoose.model('Transaction', TransactionSchema);
