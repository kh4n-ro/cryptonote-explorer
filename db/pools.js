var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var poolSchema = new Schema({
  link : String,
  api : String,
  rootapi : String,
  height : Number,
  blocksfound : Number,
  lastfoundblock : Number,
  paymentsmade : Number,
  minerspaid : Number,
  activeminers : Number,
  hashrate : Number,
  fee : Number,
  color: String,
  poolversion : String,
  minpayment : Number,
  denomination : Number,
  miningports : [Schema.Types.Mixed]
},{timestamps:true});

module.exports = mongoose.model('Pools', poolSchema);
