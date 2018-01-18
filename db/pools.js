var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    deepPopulate = require('mongoose-deep-populate')(mongoose);

var poolSchema = new Schema({
  api: String,
  frontend: String,
  data: [{ type: Schema.Types.ObjectId, ref: 'pooldata' }]
},{timestamps:true}).plugin(deepPopulate);

module.exports = mongoose.model('Pools', poolSchema);
