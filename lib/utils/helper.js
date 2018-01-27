require('./logger');
const axios = require('axios');
const CONFIG = require('../config');
const async = require('async');
const alloyrpc = require('./alloyrpc');
const DB_users = require('../../db/users');
const DB_mempool = require('../../db/mempool');

module.exports = {
  sleep  : function(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  getpools  : function(){
     async.each(CONFIG.POOLS,function(pool,callback) {
       alloyrpc.checkPool(pool);
       callback();
     },function() {
       console.success('emp-start','Collected data from %s pools', CONFIG.POOLS.length);
     })
  },
  timeformat  : function(seconds){

    var units = [
      [60, 's'],
      [60, 'min'],
      [24, 'h'],
      [7, 'd'],
      [4, 'w'],
      [12, 'mo'],
      [1, 'y']
    ];

    function formatAmounts(amount, unit) {
      var rounded = Math.round(amount);
      return '' + rounded + ' ' + unit + (rounded > 1 ? '' : '');
    }

    var amount = seconds;
    for (var i = 0; i < units.length; i++) {
      if (amount < units[i][0])
        return formatAmounts(amount, units[i][1]);
      amount = amount / units[i][0];
    }
    return formatAmounts(amount, units[units.length - 1][1]);
  },
  initMempoolDB  : function(_mpool){

    DB_mempool.find({}, (err, mempool) => {
        if (err) throw err;
        if (mempool.length == 0) {

          let newmempool = new DB_mempool({data:_mpool});

          newmempool.save(function (err) {
            if (err) console.log(err);
            console.success('emp-start','Mempool DB Created!');

          })
        }else {
          DB_mempool.findOneAndUpdate({ _id: mempool[0]._id }, {$set:{ data : _mpool }}, function(err, mpool) {
            if (err) console.log(err);
            console.info('emp-start','Mempool has %s active transactions!', mpool.data.length);
          });

        }
    })
  }
};
