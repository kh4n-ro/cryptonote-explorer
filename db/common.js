var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

var CommonSchema = new Schema({
    
  },{timestamps:true})

module.exports = mongoose.model('Common', CommonSchema);
