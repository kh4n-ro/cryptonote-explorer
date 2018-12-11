require('./logger');
const axios = require('axios');
const CONFIG = require('../config');
const DB_pools = require('../../db/pools');
const emitter = require('./events');

module.exports = {
  checkPool  : function(poolApi) {
    if (poolApi.v == 1) {
      axios.get(poolApi.api)
      .then(summary => {
        if (summary.data.pool) {
          const query = {link:poolApi.frontend};
          DB_pools.find(query, (err, pools) => {
              if (err) throw err;
              if (pools.length == 0) {
                let newpool = new DB_pools({
                  link : poolApi.frontend,
                  api : poolApi.api,
                  rootapi: poolApi.rootapi,
                  color: poolApi.color,
                  height : summary.data.network.height,
                  blocksfound : summary.data.pool.totalBlocks,
                  lastfoundblock : summary.data.pool.blocks[1],
                  paymentsmade : summary.data.pool.totalPayments,
                  minerspaid : summary.data.pool.totalMinersPaid,
                  activeminers : summary.data.pool.miners,
                  hashrate : summary.data.pool.hashrate,
                  fee : summary.data.config.fee,
                  poolversion : summary.data.config.version || 0,
                  minpayment : summary.data.config.minPaymentThreshold,
                  denomination : summary.data.config.denominationUnit,
                  miningports : summary.data.config.ports
                });
                newpool.save(function (err) {
                  if (err) console.log(err);
                  console.success('emp-start','New pool added to DB! %s', poolApi.frontend);

                })

              }else {
                var thisPool = pools[0];
                thisPool.link = poolApi.frontend;
                thisPool.api = poolApi.api;
                thisPool.rootapi = poolApi.rootapi;
                thisPool.color = poolApi.color;
                thisPool.height = summary.data.network.height;
                thisPool.blocksfound = summary.data.pool.totalBlocks;
                thisPool.lastfoundblock = summary.data.pool.blocks[1];
                thisPool.paymentsmade = summary.data.pool.totalPayments;
                thisPool.minerspaid = summary.data.pool.totalMinersPaid;
                thisPool.activeminers = summary.data.pool.miners;
                thisPool.hashrate = summary.data.pool.hashrate;
                thisPool.fee = summary.data.config.fee;
                thisPool.poolversion = summary.data.config.version || 0;
                thisPool.minpayment = summary.data.config.minPaymentThreshold;
                thisPool.denomination = summary.data.config.denominationUnit;
                thisPool.miningports = summary.data.config.ports;

                thisPool.save(function (err) {
                  if (err) console.log(err);

                })

              }
          })
        }
      })
      .catch(err => console.error('emp-start','Pool not present %s',JSON.stringify(err.config)))
    } else if(poolApi.v == 2) {
      axios.get(poolApi.api + '/pool/stats')
      .then(summary => {
        if (summary.data.pool_statistics) {
          axios.get(poolApi.api + '/network/stats')
          .then(results => {
            if (results.data) {
              let height = results.data.height;
              axios.get(poolApi.api + '/config')
              .then(result => {
                if (result.data) {
                  axios.get(poolApi.api + '/pool/ports')
                  .then(portsresult => {
                    if (portsresult.data) {
                      const query = {link:poolApi.frontend};
                      DB_pools.find(query, (err, pools) => {
                          if (err) throw err;
                          if (pools.length == 0) {
                            let newpool = new DB_pools({
                              link : poolApi.frontend,
                              api : poolApi.api,
                              rootapi : poolApi.rootapi,
                              color: poolApi.color,
                              height : results.data.height,
                              blocksfound : summary.data.pool_statistics.totalBlocksFound,
                              lastfoundblock : summary.data.pool_statistics.lastBlockFound,
                              paymentsmade : summary.data.pool_statistics.totalPayments,
                              minerspaid : summary.data.pool_statistics.totalMinersPaid,
                              activeminers : summary.data.pool_statistics.miners,
                              hashrate : summary.data.pool_statistics.hashRate,
                              fee : result.data.pplns_fee,
                              poolversion : 0,
                              minpayment : result.data.min_wallet_payout,
                              denomination : result.data.min_denom,
                              miningports : portsresult.data
                            });
                            newpool.save(function (err) {
                              if (err) console.log(err);
                              console.success('emp-start','New pool added to DB! %s', poolApi.frontend);

                            })

                          }else {
                            var thisPool = pools[0];
                            thisPool.link = poolApi.frontend;
                            thisPool.api = poolApi.api;
                            thisPool.rootapi = poolApi.rootapi;
                            thisPool.color = poolApi.color;
                            thisPool.height = results.data.height;
                            thisPool.blocksfound = summary.data.pool_statistics.totalBlocksFound;
                            thisPool.lastfoundblock = summary.data.pool_statistics.lastBlockFound;
                            thisPool.paymentsmade = summary.data.pool_statistics.totalPayments;
                            thisPool.minerspaid = summary.data.pool_statistics.totalMinersPaid;
                            thisPool.activeminers = summary.data.pool_statistics.miners;
                            thisPool.hashrate = summary.data.pool_statistics.hashRate;
                            thisPool.fee = result.data.pplns_fee;
                            thisPool.poolversion = 0;
                            thisPool.minpayment = result.data.min_wallet_payout;
                            thisPool.denomination = result.data.min_denom;
                            thisPool.miningports = portsresult.data;

                            thisPool.save(function (err) {
                              if (err) console.log(err);

                            })


                          }
                      })

                    }
                  })
                }
              });

            }
          });
        }

      })
      .catch(err => console.error('emp-start','Pool not present %s',JSON.stringify(err.config)))
    }else if (poolApi.v == 3) {
      axios.get(poolApi.api)
      .then(summary => {
        if (summary.data.pool) {
          const query = {link:poolApi.frontend};
          DB_pools.find(query, (err, pools) => {
              if (err) throw err;
              if (pools.length == 0) {

                let newpool = new DB_pools({
                  link : poolApi.frontend,
                  api : poolApi.api,
                  rootapi : poolApi.rootapi,
                  color: poolApi.color,
                  height : summary.data.lastblock.height,
                  blocksfound : summary.data.pool.totalBlocks,
                  lastfoundblock : summary.data.pool.blocks[1],
                  paymentsmade : summary.data.pool.totalPayments,
                  minerspaid : summary.data.pool.totalMinersPaid,
                  activeminers : summary.data.pool.miners,
                  hashrate : summary.data.pool.hashrate,
                  fee : summary.data.config.fee,
                  poolversion : summary.data.config.version || 0,
                  minpayment : summary.data.config.minPaymentThreshold,
                  denomination : summary.data.config.denominationUnit,
                  miningports : summary.data.config.ports
                });
                newpool.save(function (err) {
                  if (err) console.log(err);
                  console.success('emp-start','New pool added to DB! %s', poolApi.frontend);

                })

              }else {
                var thisPool = pools[0];
                thisPool.link = poolApi.frontend;
                thisPool.api = poolApi.api;
                thisPool.rootapi = poolApi.rootapi;
                thisPool.color = poolApi.color;
                thisPool.height = summary.data.lastblock.height;
                thisPool.blocksfound = summary.data.pool.totalBlocks;
                thisPool.lastfoundblock = summary.data.pool.blocks[1];
                thisPool.paymentsmade = summary.data.pool.totalPayments;
                thisPool.minerspaid = summary.data.pool.totalMinersPaid;
                thisPool.activeminers = summary.data.pool.miners;
                thisPool.hashrate = summary.data.pool.hashrate;
                thisPool.fee = summary.data.config.fee;
                thisPool.poolversion = summary.data.config.version || 0;
                thisPool.minpayment = summary.data.config.minPaymentThreshold;
                thisPool.denomination = summary.data.config.denominationUnit;
                thisPool.miningports = summary.data.config.ports;

                thisPool.save(function (err) {
                  if (err) console.log(err);

                })

              }
          })
        }
      })
      .catch(err => console.error('emp-start','Pool not present %s',JSON.stringify(err.config)))
    }

  },
  getPools  : function() {
    DB_pools.find({}, (err, pools) => {
        if (err) throw err;
        emitter.emit('poolInfo', pools);
        return pools;
    })
  },
  tradeogre_stats  : function(){
    axios.get('https://tradeogre.com/api/v1/ticker/' + CONFIG.TO_TICKER)
    .then(summary => {
      if (summary.data.success) {
        emitter.emit('tradeogre-update',summary.data);
        return summary.data;
      }
    })
    .catch(err => console.error('emp-start','Cannot reach tradeogre_stats %s',err))
  },
  daemon_getinfo  : function(){
    axios.get(CONFIG.DAEMON.PROTOCOL + '://' + CONFIG.DAEMON.HOST + ':' + CONFIG.DAEMON.PORT + '/getinfo')
    .then(summary => {
      if (summary.data) {
        emitter.emit('getinfo',summary.data);
        return summary.data;
      }
    })
    .catch(err => console.error('emp-start','Cannot reach daemon_getinfo %s',err))
  },
  daemon_lastblockheader  : function(){
    axios.post(CONFIG.DAEMON.PROTOCOL + '://' + CONFIG.DAEMON.HOST + ':' + CONFIG.DAEMON.PORT + '/json_rpc',{
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
    .catch(err => console.error('emp-start','Cannot reach daemon_lastblockheader %s',err.config.url))
  },
  daemon_searchblockbyhash  : function(query, cb){
    axios.post(CONFIG.DAEMON.PROTOCOL + '://' + CONFIG.DAEMON.HOST + ':' + CONFIG.DAEMON.PORT + '/json_rpc',{
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
    .catch(err => console.error('emp-start','Cannot reach daemon_searchblockbyhash %s',err))
  },
  daemon_searchblockbyheight  : function(height, cb){
    axios.post(CONFIG.DAEMON.PROTOCOL + '://' + CONFIG.DAEMON.HOST + ':' + CONFIG.DAEMON.PORT + '/json_rpc',{
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
    .catch(err => console.error('emp-start','Cannot reach daemon_searchblockbyheight %s',err))
  },
  daemon_searchtransaction  : function(query, cb){
    axios.post(CONFIG.DAEMON.PROTOCOL + '://' + CONFIG.DAEMON.HOST + ':' + CONFIG.DAEMON.PORT + '/json_rpc',{
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
    .catch(err => console.error('emp-start','Cannot reach daemon_searchtransaction %s',err))
  },
  daemon_getblockslist  : function(query){
    axios.post(CONFIG.DAEMON.PROTOCOL + '://' + CONFIG.DAEMON.HOST + ':' + CONFIG.DAEMON.PORT + '/json_rpc',{
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
    .catch(err => console.error('emp-start','Cannot reach daemon_getblockslist %s',err))
  },
  daemon_getlastblocks  : function(query, cb){
    axios.post(CONFIG.DAEMON.PROTOCOL + '://' + CONFIG.DAEMON.HOST + ':' + CONFIG.DAEMON.PORT + '/json_rpc',{
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
    .catch(err => console.error('emp-start','Cannot reach daemon_getlastblocks %s',err))
  },
  daemon_searchpaymentid  : function(query, cb){
    axios.post(CONFIG.DAEMON.PROTOCOL + '://' + CONFIG.DAEMON.HOST + ':' + CONFIG.DAEMON.PORT + '/json_rpc',{
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
    .catch(err => console.error('emp-start','Cannot reach daemon_searchpaymentid %s',err))
  },
  daemon_mempool  : async function(){
    axios.post(CONFIG.DAEMON.PROTOCOL + '://' + CONFIG.DAEMON.HOST + ':' + CONFIG.DAEMON.PORT + '/json_rpc',{
          jsonrpc: "2.0",
          id: "test",
          method: "f_on_transactions_pool_json",
          params: {}
    })
    .then(summary => {
      emitter.emit('mempool',summary.data.result.transactions);
      return summary.data.result.transactions;
    })
    .catch(err => console.error('emp-start','Cannot reach daemon_mempool %s',err))
  }
};
