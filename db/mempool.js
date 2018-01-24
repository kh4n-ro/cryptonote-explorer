var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var mempoolSchema = new Schema({
  data: [{
    amount_out: Number,
    hash: String,
    size: Number,
    fee: Number
  }]
},{timestamps:true});

module.exports = mongoose.model('mempool', mempoolSchema);
