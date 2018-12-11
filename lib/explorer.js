const DB_pools = require('../db/pools');
const CONFIG = require('./config');
let helper = require("./utils/helper");
let RPC = require("./utils/rpc");

const DB_mempool = require('../db/mempool');
const DB_avgcharts = require('../db/avgcharts');

let GETINFO = {};
let LASTBLOCKHEADER = {};
let LASTBLOCK = {};
let HISTORY_BLOCKS = [];
let HISTORY_BLOCKS_INTERVAL = 60 * 1000;
let ACTIVE_HEIGHT = 0;

const HISTORY_BLOCKS_LEN = CONFIG.HISTORY_BLOCKS_LEN;
const GET_POOLS_SECONDS = CONFIG.GET_POOLS_SECONDS;
const GET_MEMPOOL_SECONDS = CONFIG.GET_MEMPOOL_SECONDS;
const GET_INFO_SECONDS = CONFIG.GET_INFO_SECONDS;
const GET_BLOCKSLIST_MINUTES = CONFIG.GET_BLOCKSLIST_MINUTES;
const LIGHT_BLOCKS_HISTORY = CONFIG.LIGHT_BLOCKS_HISTORY;
const HISTORY_CHART_MINUTES = CONFIG.HISTORY_CHART_MINUTES;
const EXCHANGE_UPDATE_INTERVAL = CONFIG.EXCHANGE_UPDATE_INTERVAL;
const REMOTE_NODES_REFRESH = 1 * 60 * 1000;

var historyLocked = false;
var lastblockLocked = false;
var realbt = [];

const emitter = require('./utils/events');
emitter.setMaxListeners(0);

function explorer(primus)
{

  const setupSockets = () => {

    primus.on('connection', function (spark)
    {

      spark.on('data', function (data)
      {
        data = data || {};
        let action = data.action;
        let _room = data.room;

        // join a room
        if ('join' === action) {

           spark.join(_room, function() {
             var roomLength = _room.replace(/^/gi, "").length;
             if (_room === 'admin') {

             } else if(_room === 'explorer') {

               spark.write({action:'lastblocks', data : this.blockslist});
               spark.write({action:'deepstats', data : this.deep_stats});
               spark.write({action:'laststats', data : this.stats});
               spark.write({action:'homecharts', data : this.homecharts});
               spark.write({action:'average_charts', data : this.average_charts});
               spark.write({action:'mempoolcharts', data : this.mempoolcharts});
               spark.write({action:'mempool', data : this.mempool});
               spark.write({action:'pools', data : this.pools});
               spark.write({action:'remotes', data : this.remotes});

             }

            // send message to this client
            spark.write({action:'client-message', data:'you joined the '+ _room +' room '});
            spark.write({action:'config', data : this.config});


          }.bind(this));
        }

        if ('reconnect' === action) {
          console.info('resetting sockets')
          setupSockets();
        }

        if ('leave' === action) {
         spark.leave(room, function () {
           // send message to this client
           spark.write({action:'client-message', data:'you left '+ _room +' room '});
         });
        }


      }.bind(this));

    }.bind(this));
  };
  this.realbt = [];
  this.mempool = [];
  this.getinfo = {};
  this.blockslist = [];
  this.historyblocks = [];
  this.lastblock = {};

  this.average_charts = {
    hashrate : [],
    difficulties : [],
    fees : [],
    sizes : [],
    timestamps : []
  };

  this.homecharts = {
    difficulties : [],
    blocks : [],
    timestamps : []
  };

  this.mempoolcharts = {
    blocks : [],
    fees : [],
    txes : [],
    sizes : [],
    timestamps : []
  };

  this.remotes = CONFIG.REMOTES;

  this.stats = {
    symbol: CONFIG.SYMBOL,
    difficulty : 0,
    height : 0,
    lastblockheight : 0,
    tx_count : 0,
    tx_pool_size : 0,
    tx_pool_value : 0,
    tx_pool_fees : 0,
    tx_pool_totalsize : 0,
    tx_pool_avg_tx_value : 0,
    tx_pool_avg_tx_fee : 0,
    tx_pool_avg_tx_size : 0
  };

  this.deep_stats = {
    averagehs : 0,
    averagedifficulty: 0,
    averageblocktime: 0,
    averagefee: 0,
    averagebt: 0,
    averagesize: 0,
    symbol: CONFIG.SYMBOL
  };

  this.config = {
    name : CONFIG.NAME,
    symbol: CONFIG.SYMBOL,
    paper_wallet_config : CONFIG.PAPERWALLET,
    hidedominantpools : CONFIG.HIDE_DOMINANT_POOLS,
    dominancepercent: CONFIG.DOMINANCE_PERCENT
  };

  this.pools = [];

  this.savedheight = 0;
  this.emissionpercent = 0;

  emitter.on('poolInfo', function (pools) {
    this.pools = pools;
    this.processPools(pools);
    primus.write({action:'pools', data : pools})
  }.bind(this));

  emitter.on('tradeogre-update', function (update) {
    this.stats.lastprice = update.price;
    this.stats.tradedvolume = update.volume;
    this.stats.pricehigh = update.high;
    this.stats.pricelow = update.low;
  }.bind(this));

  this.processPools = function (pools) {

    var totalHashrate = 0;
    var totalMiners = 0;
    var totalPools = pools.length;

    for (var i = 0; i < pools.length; i++) {
      totalHashrate = totalHashrate + pools[i].hashrate;
      totalMiners = totalMiners + pools[i].activeminers;
    }

    this.stats.knownpools = pools.length;
    this.stats.poolshashrate = totalHashrate;
    this.stats.knownminers = totalMiners;

  }

  this.init = function (data) {

    // get pool data
    helper.getpools();
    RPC.getPools();
    setInterval( () => {
      helper.getpools();
      RPC.getPools();
    }, 1000 * GET_POOLS_SECONDS);

    // get mempool data
    RPC.daemon_mempool();
    setInterval( () => { RPC.daemon_mempool(); }, 1000 * GET_MEMPOOL_SECONDS);

    // get daemon info
    RPC.daemon_getinfo();
    setInterval( () => { RPC.daemon_getinfo(); }, 1000 * GET_INFO_SECONDS);

// 	   get TO ticker data
    RPC.tradeogre_stats();
    setInterval( () => { RPC.tradeogre_stats(); }, 1000 * EXCHANGE_UPDATE_INTERVAL);

    // get average charts from db if they have been added
    DB_avgcharts.find({}, (err, charts) => {
        if (err) throw err;
        if (charts.length > 0) {
          this.average_charts = charts[0];
        }
    })

    // get daemon lastblock
    setInterval( () => {
      if (this.stats.lastblockheight && !lastblockLocked) {
        RPC.daemon_searchblockbyheight(this.stats.lastblockheight, function (block) {
          emitter.emit('lastblock', block);
        });
      }
    }, 1000 * 15);

    setInterval( () => {
      if (this.historyblocks[0]) {
        update_history_averages(HISTORY_BLOCKS_LEN, this.homecharts, this.mempoolcharts);
      }
    }, 1000 * 15);

    setInterval( () => {
      for (var i = 0; i < this.remotes.length; i++) {
        helper.process_remote(this.remotes[i]);
      }
      primus.write({
        action: 'remotes',
        data: this.remotes
      });

    }, REMOTE_NODES_REFRESH);

    for (var i = 0; i < this.remotes.length; i++) {
      helper.process_remote(this.remotes[i]);
    }
    setInterval( () => {
      if (this.deep_stats) {

        ring(parseInt(this.deep_stats.averagebts),this.average_charts.averagebts, HISTORY_BLOCKS_LEN);
        ring(parseInt(this.deep_stats.averagehs),this.average_charts.hashrate, HISTORY_BLOCKS_LEN);
        ring(parseInt(this.deep_stats.instanths),this.average_charts.instanths, HISTORY_BLOCKS_LEN);
        ring(parseInt(this.deep_stats.averagedifficulty),this.average_charts.difficulties, HISTORY_BLOCKS_LEN);
        ring(parseInt(this.deep_stats.averagefee),this.average_charts.fees, HISTORY_BLOCKS_LEN);
        ring(parseInt(this.deep_stats.averagesize),this.average_charts.sizes, HISTORY_BLOCKS_LEN);
        ring(new Date(Date.now()).toISOString(),this.average_charts.timestamps, HISTORY_BLOCKS_LEN);

        primus.write({
          action: 'average_charts',
          data: this.average_charts
        });

        // update/create avgchart
        DB_avgcharts.find({}, (err, charts) => {
            if (err) throw err;
            if (charts.length == 0) {

              new DB_avgcharts(this.average_charts).save(function (err) {
                if (err) console.log(err);
                console.success('emp-start','Average Charts added to DB!');
              });

            }else {
              var thischart = charts[0];

              thischart.hashrate = this.average_charts.hashrate
              thischart.difficulties = this.average_charts.difficulties
              thischart.fees = this.average_charts.fees
              thischart.sizes = this.average_charts.sizes
              thischart.timestamps = this.average_charts.timestamps

              thischart.save(function (err) {
                if (err) console.log(err);
                console.success('emp-start','Updated Average Charts!');
              })

            }
        })
      }

    }, 1000 * 60 * HISTORY_CHART_MINUTES);

    setupSockets();

  }

  emitter.on('remote', function(remote) {
    for (var i = 0; i < this.remotes.length; i++) {
      if (this.remotes[i].ip === remote.ip) {
        this.remotes[i] = remote;
      }
    }
  }.bind(this))

  emitter.on('lastblock', function (block) {
    lastblockLocked = true;

    this.lastblock = block;

    // update remaining stats
    this.stats.supply = parseFloat(block.alreadyGeneratedCoins * CONFIG.COINUNITS).toFixed(2);
    this.stats.supply = (parseInt(this.stats.supply || 0) / CONFIG.COINUNITS).toFixed(2 || CONFIG.COINUNITS.toString().length - 1);
    this.stats.reward = parseFloat(block.reward / CONFIG.COINUNITS).toFixed(4);
    this.stats.emission = parseFloat((block.alreadyGeneratedCoins * CONFIG.COINUNITS * 100) / (CONFIG.MAXSUPPLY * CONFIG.COINUNITS)).toFixed(4);
    this.stats.currentdifficulty = block.difficulty;
    this.stats.currenthashrate = block.difficulty / CONFIG.BLOCKTARGETINTERVAL;

    primus.write({
      action: 'laststats',
      data: this.stats
    });

  }.bind(this))

  emitter.on('blockslist', function (blocks) {
    this.blockslist = blocks;
    primus.write({
      action: 'lastblocks',
      data: this.blockslist
    });
  }.bind(this))

  emitter.on('deep-stats', function (stats) {
    this.deep_stats = stats;
    primus.write({
      action: 'deepstats',
      data: this.deep_stats
    });
  }.bind(this))

  emitter.on('mempool',function (mempool) {
    this.mempool = mempool;
    var mempoolsum = 0;
    var mempoolfeesum = 0;
    var mempoolsizesum = 0;
    for (var i = 0; i < mempool.length; i++) {
      mempoolsum = mempoolsum + mempool[i].amount_out;
      mempoolfeesum = mempoolfeesum + mempool[i].fee;
      mempoolsizesum = mempoolsizesum + mempool[i].size;
    }
    this.stats.tx_pool_value = parseFloat(mempoolsum / CONFIG.COINUNITS).toFixed(4);
    this.stats.tx_pool_fees = parseFloat(mempoolfeesum / CONFIG.COINUNITS).toFixed(8);
    this.stats.tx_pool_totalsize = mempoolsizesum;
    this.stats.tx_pool_avg_tx_value  = parseFloat((mempoolsum/mempool.length) / CONFIG.COINUNITS).toFixed(4);
    this.stats.tx_pool_avg_tx_fee  = parseFloat((mempoolfeesum/mempool.length) / CONFIG.COINUNITS).toFixed(8);
    this.stats.tx_pool_avg_tx_size  = mempoolsizesum/mempool.length;

    helper.initMempoolDB(mempool);
    primus.write({
      action: 'mempool',
      data: mempool
    });

  }.bind(this))

  emitter.on('history-block',function (block) {
    // populate history block
    this.historyblocks.push(block);

    // populate homecharts
    this.homecharts.difficulties.push(block.difficulty);
    this.homecharts.blocks.push(block.height);
    this.homecharts.timestamps.push(new Date(block.timestamp * 1000).toISOString());


    // populate mempoolcharts
    this.mempoolcharts.blocks.push(block.height);
    this.mempoolcharts.txes.push(block.transactions.length);
    this.mempoolcharts.sizes.push(block.transactionsCumulativeSize);
    this.mempoolcharts.fees.push(block.totalFeeAmount);
    this.mempoolcharts.timestamps.push(new Date(block.timestamp * 1000).toISOString());
    realbt.push(block.timestamp * 1000);

  }.bind(this))

  emitter.on('getinfo',function (getinfo) {
    this.getinfo = getinfo;
    if (this.stats.lastblockheight > 0 && this.stats.lastblockheight !== getinfo.height-1) {
      console.success('emp-start','New Block Found: %s | Current Difficulty: %s | Total '+ CONFIG.PAPERWALLET.coinName +' Transactions: %s', getinfo.height-1,this.stats.difficulty,this.stats.tx_count);
      RPC.daemon_searchblockbyheight(getinfo.height-1,function (block) {

        // update lastblock
        this.lastblock = block;

        // fetch latest 15 light blocks
        RPC.daemon_getblockslist(block.height);

        // add block to history blocks
        ring(block,this.historyblocks,HISTORY_BLOCKS_LEN);

        // update light homecharts: actual difficulty
        ring(parseInt(block.difficulty),this.homecharts.difficulties, HISTORY_BLOCKS_LEN);
        ring(parseInt(block.height),this.homecharts.blocks, HISTORY_BLOCKS_LEN);
        ring(new Date(block.timestamp * 1000).toISOString(),this.homecharts.timestamps, HISTORY_BLOCKS_LEN);
        ring(block.timestamp * 1000,realbt, HISTORY_BLOCKS_LEN);

        // update light mempoolcharts:
        ring(parseInt(block.height),this.mempoolcharts.blocks, HISTORY_BLOCKS_LEN);
        ring(parseInt(block.transactions.length),this.mempoolcharts.txes, HISTORY_BLOCKS_LEN);
        ring(parseInt(block.transactionsCumulativeSize),this.mempoolcharts.sizes, HISTORY_BLOCKS_LEN);
        ring(parseInt(block.totalFeeAmount),this.mempoolcharts.fees, HISTORY_BLOCKS_LEN);
        ring(new Date(block.timestamp * 1000).toISOString(),this.mempoolcharts.timestamps, HISTORY_BLOCKS_LEN);

        // update averages
        update_history_averages(HISTORY_BLOCKS_LEN, this.homecharts, this.mempoolcharts);

        // update remaining stats
        this.stats.supply = parseFloat(block.alreadyGeneratedCoins * CONFIG.COINUNITS).toFixed(2);
        this.stats.supply = (parseInt(this.stats.supply || 0) / CONFIG.COINUNITS).toFixed(2 || CONFIG.COINUNITS.toString().length - 1);
        this.stats.reward = parseFloat(block.reward / CONFIG.COINUNITS).toFixed(4);
        this.stats.emission = parseFloat((block.alreadyGeneratedCoins * CONFIG.COINUNITS * 100) / (CONFIG.MAXSUPPLY * CONFIG.COINUNITS)).toFixed(4);
        this.stats.currentdifficulty = block.difficulty;
        this.stats.currenthashrate = block.difficulty / CONFIG.BLOCKTARGETINTERVAL;

        // finally broadcast
        primus.write({
          action: 'laststats',
          data: this.stats
        });

        primus.write({
          action: 'homecharts',
          data: this.homecharts
        });

        primus.write({
          action: 'deepstats',
          data: this.deep_stats
        });

        primus.write({
          action: 'mempoolcharts',
          data: this.mempoolcharts
        });

      }.bind(this))
    }
    this.stats.difficulty = getinfo.difficulty;
    this.stats.height = getinfo.height;
    this.stats.lastblockheight = getinfo.height - 1;
    this.stats.tx_count = getinfo.tx_count;
    this.stats.tx_pool_size = getinfo.tx_pool_size;

    primus.write({
      action: 'laststats',
      data: this.stats
    });

    if (!historyLocked) {
      //get deep history
      pull_history_blocks(HISTORY_BLOCKS_LEN, this.stats.height);
      historyLocked = true;

      // fetch and send the latest 15 blocks
      RPC.daemon_getblockslist(this.stats.height-1)

      update_history_averages(HISTORY_BLOCKS_LEN, this.homecharts, this.mempoolcharts);

    }
  }.bind(this))

  function pull_history_blocks(len, height) {
    let stopheight = parseInt(height);
    let startheight = parseInt(stopheight - len);

    for (var i = 0; i < len; i++) {
      RPC.daemon_searchblockbyheight(startheight+i,function (block) {
        emitter.emit('history-block',block);
      })
      setInterval(function () {}, 250);
    }

  }

  var ring = function(block, blocks, targetlen){
   if(blocks) {
	if(blocks.length == targetlen){
        blocks.shift();
    }else if(blocks.length > targetlen){
      var blocksDiff = blocks.length - targetlen;
      blocks = blocks.slice(blocksDiff+1,blocks.length);
    }
    blocks.push(block);

    return blocks;

   }
  };

  function update_history_averages(len, homecharts, mempoolcharts) {
    var diffsum = homecharts.difficulties.reduce(add, 0);
    var feesum = mempoolcharts.fees.reduce(add, 0);
    var sizesum = mempoolcharts.sizes.reduce(add, 0);

    function add(a, b) {
      return a + b;
    }


    var sums = [];
    for (var i = 0; i < realbt.length-1; i++) {
      sums.push( realbt[i+1] - realbt[i] )
    }

    var realbtsum = sums.reduce(add, 0);

    var stats = {};
    stats.symbol = CONFIG.SYMBOL;
    stats.averagedifficulty = Math.round(diffsum / len);
    stats.averagesize = Math.round(sizesum / len);
    stats.averagefee = Math.round(feesum / len);
    stats.teargetedhashrate = stats.averagedifficulty / CONFIG.BLOCKTARGETINTERVAL;
    stats.targetblocktime = CONFIG.BLOCKTARGETINTERVAL;

    stats.averagebts = parseInt(realbtsum/sums.length/1000);
    stats.averagehs = parseInt(diffsum/(stats.averagebts*sums.length));
    stats.instanths = parseInt(homecharts.difficulties[0]/stats.averagebts);

    emitter.emit('deep-stats',stats);

  };

  function timeformat(seconds) {

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
  }

  return this;
}

module.exports = explorer;
