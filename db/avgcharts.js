var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var avgchartsSchema = new Schema({
  hashrate: [],
  difficulties : [],
  fees : [],
  sizes : [],
  timestamps : []
},{timestamps:true});

module.exports = mongoose.model('avgcharts', avgchartsSchema);
