var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var mempoolSchema = new Schema({
  hash: String,
  size: Number,
  fee: Number,
  firstseen: String
},{timestamps:true});

module.exports = mongoose.model('mempool', mempoolSchema);
