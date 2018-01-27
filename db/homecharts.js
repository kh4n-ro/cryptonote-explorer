var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var homechartsSchema = new Schema({
  blocks: [],
  difficulties : [],
  timestamps : []
},{timestamps:true});

module.exports = mongoose.model('homecharts', homechartsSchema);
