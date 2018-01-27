var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var mempoolchartsSchema = new Schema({
  blocks: [],
  fees : [],
  txes : [],
  sizes : [],
  timestamps : []
},{timestamps:true});

module.exports = mongoose.model('mempoolcharts', mempoolchartsSchema);
