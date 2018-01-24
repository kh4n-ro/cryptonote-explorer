var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    deepPopulate = require('mongoose-deep-populate')(mongoose);

var poolSchema = new Schema({
  api: String,
  frontend: String,
  data: [{
    config: {
      ports: [{
        port: Number,
        difficulty: Number,
        desc: String
      }],
      hashrateWindow: Number,
      fee: Number,
      coin: String,
      symbol: String,
      depth: Number,
      coreDonation: Number,
      doDonations: Boolean,
      version: String,
      minPaymentThreshold: Number,
      denominationUnit: Number,
      blockTime: Number,
      slushMiningEnabled: Boolean,
      weight: Number
    },
    pool: {
      stats: {
        lastBlockFound: String
      },
      totalBlocks: Number,
      totalPayments: Number,
      totalMinersPaid: Number,
      miners: Number,
      hashrate: Number,
      roundHashes: Number,
      lastBlockFound: String
    },
    network: {
      difficulty: Number,
      height: Number,
      timestamp: Number,
      reward: Number,
      hash: String
    }
  }]
},{timestamps:true}).plugin(deepPopulate);

module.exports = mongoose.model('Pools', poolSchema);
