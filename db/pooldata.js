var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    deepPopulate = require('mongoose-deep-populate')(mongoose);

var pooldataSchema = new Schema({
  frontend: String,
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
},{timestamps:true}).plugin(deepPopulate);

pooldataSchema.pre('save', function (next) {
  var pooldata = this;
  pooldata.updatedAt = Date.now();
  next();
});

pooldataSchema.post('save', function () {
  var pooldata = this;
  pooldata.model('Pools').update(
    {frontend: pooldata.frontend},
    {$addToSet: {data: pooldata._id}} , function (err, results) {
      if(err) console.log(err);
  });
});

module.exports = mongoose.model('pooldata', pooldataSchema);
