require('./logger');
const axios = require('axios');
const CONFIG = require('../config');
const DB_pools = require('../../db/pools');
const emitter = require('./events');

module.exports = {
  checkPool  : function(poolApi) {
    axios.get(poolApi.api)
    .then(summary => {
      if (summary.data.pool) {
        const config = summary.data.config;
        const network = summary.data.network;
        const pool = summary.data.pool;

        const poolData = {
          config: config,
          pool: pool,
          network: network
        };
        const query = {frontend:poolApi.frontend};

        DB_pools.find(query, (err, pools) => {
            if (err) throw err;
            if (pools.length == 0) {

              let newpool = new DB_pools({
                  api: poolApi.api,
                  frontend: poolApi.frontend,
                  data: [{
                    config: config,
                    pool: pool,
                    network: network
                  }]
              });

              newpool.save(function (err) {
                if (err) console.log(err);
                console.success('emp-start','New pool added to DB! %s', poolApi.frontend);

              })
            }else {
              var thisPool = pools[0];
              thisPool.config = config;
              thisPool.pool = pool;
              thisPool.network = network;

              thisPool.save(function (err) {
                if (err) console.log(err);

              })

            }
        })
      }

    })
    .catch(err => console.error('emp-start','Pool not present %s',err.config.url))
  },
  daemon_getinfo  : function(){
    axios.get(CONFIG.DAEMON + '/getinfo')
    .then(summary => {
      if (summary.data) {
        emitter.emit('getinfo',summary.data);
        return summary.data;
      }
    })
    .catch(err => console.error('emp-start','Cannot reach daemon %s',err))
  },
  daemon_lastblockheader  : function(){
    axios.post(CONFIG.DAEMON + '/json_rpc',{
          jsonrpc:"2.0",
          id: "test",
          method:"getlastblockheader",
          params: {}
    })
    .then(summary => {
      daemon_searchblockbyhash(summary.data.result.block_header.hash, function (result) {
        return result;
      })
    })
    .catch(err => console.error('emp-start','Cannot reach daemon %s',err.config.url))
  },
  daemon_searchblockbyhash  : function(query, cb){
    axios.post(CONFIG.DAEMON + '/json_rpc',{
        jsonrpc:"2.0",
        id: "GetSearchBlock",
        method:"f_block_json",
        params: {
           hash: query
        }
    })
    .then(summary => {
      if (summary.data.result) {
        return cb(summary.data.result.block);
      }else {
        return cb('KO');
      }
    })
    .catch(err => console.error('emp-start','Cannot reach daemon %s',err))
  },
  daemon_searchblockbyheight  : function(height, cb){
    axios.post(CONFIG.DAEMON + '/json_rpc',{
        jsonrpc:"2.0",
        id: "blockbyheight",
        method:"getblockheaderbyheight",
        params: {
           height: parseInt(height)
        }
    })
    .then(summary => {
      if (summary.data.result) {
        this.daemon_searchblockbyhash(summary.data.result.block_header.hash, function (result) {
          return cb(result);
        })
      }else {
        return cb('KO');
      }
    })
    .catch(err => console.error('emp-start','Cannot reach daemon %s',err))
  },
  daemon_searchtransaction  : function(query, cb){
    axios.post(CONFIG.DAEMON + '/json_rpc',{
        jsonrpc:"2.0",
        id: "test",
        method:"f_transaction_json",
        params: {
           hash: query
        }
    })
    .then(summary => {
      if (summary.data.result) {
        return cb(summary.data.result);
      }else {
        return cb('KO');
      }
    })
    .catch(err => console.error('emp-start','Cannot reach daemon %s',err))
  },
  daemon_getblockslist  : function(query){
    axios.post(CONFIG.DAEMON + '/json_rpc',{
        jsonrpc:"2.0",
        id: "test",
        method:"f_blocks_list_json",
        params: {
           height: parseInt(query)
        }
    })
    .then(summary => {
      if (summary.data.result) {
        emitter.emit('blockslist', summary.data.result.blocks)
        return summary.data.result.blocks;
      }
    })
    .catch(err => console.error('emp-start','Cannot reach daemon %s',err))
  },
  daemon_getlastblocks  : function(query, cb){
    axios.post(CONFIG.DAEMON + '/json_rpc',{
        jsonrpc:"2.0",
        id: "test",
        method:"f_blocks_list_json",
        params: {
           height: parseInt(query)
        }
    })
    .then(summary => {
      if (summary.data.result) {
        return summary.data.result.blocks;
      }
    })
    .catch(err => console.error('emp-start','Cannot reach daemon %s',err))
  },
  daemon_searchpaymentid  : function(query, cb){
    axios.post(CONFIG.DAEMON + '/json_rpc',{
        jsonrpc:"2.0",
        id: "test",
        method:"k_transactions_by_payment_id",
        params: {
           payment_id: query
        }
    })
    .then(summary => {
      if (summary.data.result) {
        return cb(summary.data.result);
      }
    })
    .catch(err => console.error('emp-start','Cannot reach daemon %s',err))
  },
  daemon_mempool  : async function(){
    axios.post(CONFIG.DAEMON + '/json_rpc',{
          jsonrpc: "2.0",
          id: "test",
          method: "f_on_transactions_pool_json",
          params: {}
    })
    .then(summary => {
      emitter.emit('mempool',summary.data.result.transactions);
      return summary.data.result.transactions;
    })
    .catch(err => console.error('emp-start','Cannot reach daemon %s',err))
  }
};
