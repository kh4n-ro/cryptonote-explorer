const DB_pools = require('../db/pools');
const CONFIG = require('./config');
const async = require('async');
let helper = require("./utils/helper");
let alloyrpc = require("./utils/alloyrpc");

const DB_mempool = require('../db/mempool');
const DB_avgcharts = require('../db/avgcharts');

let GETINFO = {};
let LASTBLOCKHEADER = {};
let LASTBLOCK = {};
let HISTORY_BLOCKS = [];
let HISTORY_BLOCKS_INTERVAL = 60 * 1000;
let ACTIVE_HEIGHT = 0;

const HISTORY_BLOCKS_LEN = 60;
const GET_POOLS_MINUTES = 3;
const GET_MEMPOOL_SECONDS = 10;
const GET_INFO_SECONDS = 15;
const GET_BLOCKSLIST_MINUTES = 1;
const LIGHT_BLOCKS_HISTORY = 15;
const HISTORY_CHART_MINUTES = 30;

var historyLocked = false;
var lastblockLocked = false;

const emitter = require('./utils/events');
emitter.setMaxListeners(0);

function explorer(wss)
{
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
    averagehashrate : 0,
    averagedifficulty: 0,
    averageblocktime: 0,
    averagefee: 0,
    averagesize: 0,
    symbol: CONFIG.SYMBOL
  };

  this.savedheight = 0;
  this.emissionpercent = 0;

  this.init = function (data) {

    // get pool data
    helper.getpools();
    setInterval( () => { helper.getpools(); }, 1000 * 60 * GET_POOLS_MINUTES);

    // get mempool data
    alloyrpc.daemon_mempool();
    setInterval( () => { alloyrpc.daemon_mempool(); }, 1000 * GET_MEMPOOL_SECONDS);

    // get daemon info
    alloyrpc.daemon_getinfo();
    setInterval( () => { alloyrpc.daemon_getinfo(); }, 1000 * GET_INFO_SECONDS);

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
        alloyrpc.daemon_searchblockbyheight(this.stats.lastblockheight, function (block) {
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
      if (this.deep_stats) {

        ring(parseInt(this.deep_stats.averagehashrate),this.average_charts.hashrate, HISTORY_BLOCKS_LEN);
        ring(parseInt(this.deep_stats.averagedifficulty),this.average_charts.difficulties, HISTORY_BLOCKS_LEN);
        ring(parseInt(this.deep_stats.averagefee),this.average_charts.fees, HISTORY_BLOCKS_LEN);
        ring(parseInt(this.deep_stats.averagesize),this.average_charts.sizes, HISTORY_BLOCKS_LEN);
        ring(new Date(Date.now()).toISOString(),this.average_charts.timestamps, HISTORY_BLOCKS_LEN);

        wss.broadcast(JSON.stringify({type:'average_charts', data: this.average_charts}));

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

  }

  emitter.on('lastblock', function (block) {
    lastblockLocked = true;

    this.lastblock = block;

    // update remaining stats
    this.stats.supply = parseFloat(block.alreadyGeneratedCoins * Math.pow(10, 12)).toFixed(2);
    this.stats.supply = (parseInt(this.stats.supply || 0) / Math.pow(10, 12)).toFixed(2 || Math.pow(10, 12).toString().length - 1);
    this.stats.reward = parseFloat(block.reward / CONFIG.COINUNITS).toFixed(4);
    this.stats.emission = parseFloat((block.alreadyGeneratedCoins * Math.pow(10, 12)) / 8400000000000000000 * 10).toFixed(4);
    this.stats.currentdifficulty = block.difficulty;
    this.stats.currenthashrate = block.difficulty / CONFIG.BLOCKTARGETINTERVAL;

    wss.broadcast(JSON.stringify({type:'laststats', data: this.stats}));

  }.bind(this))

  emitter.on('blockslist', function (blocks) {
    this.blockslist = blocks;
  }.bind(this))

  emitter.on('deep-stats', function (stats) {
    this.deep_stats = stats;
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

  }.bind(this))

  emitter.on('getinfo',function (getinfo) {
    this.getinfo = getinfo;
    if (this.stats.lastblockheight > 0 && this.stats.lastblockheight !== getinfo.height-1) {
      console.success('emp-start','New Block Found: %s | Current Difficulty: %s | Total Alloy Transactions: %s', getinfo.height-1,this.stats.difficulty,this.stats.tx_count);
      alloyrpc.daemon_getblockslist(LIGHT_BLOCKS_HISTORY);
      alloyrpc.daemon_searchblockbyheight(getinfo.height-1,function (block) {

        // update lastblock
        this.lastblock = block;

        // fetch latest 15 light blocks
        alloyrpc.daemon_getblockslist(block.height);

        // add block to history blocks
        ring(block,this.historyblocks,HISTORY_BLOCKS_LEN);

        // update light homecharts: actual difficulty
        ring(parseInt(block.difficulty),this.homecharts.difficulties, HISTORY_BLOCKS_LEN);
        ring(parseInt(block.height),this.homecharts.blocks, HISTORY_BLOCKS_LEN);
        ring(new Date(block.timestamp * 1000).toISOString(),this.homecharts.timestamps, HISTORY_BLOCKS_LEN);

        // update light mempoolcharts:
        ring(parseInt(block.height),this.mempoolcharts.blocks, HISTORY_BLOCKS_LEN);
        ring(parseInt(block.transactions.length),this.mempoolcharts.txes, HISTORY_BLOCKS_LEN);
        ring(parseInt(block.transactionsCumulativeSize),this.mempoolcharts.sizes, HISTORY_BLOCKS_LEN);
        ring(parseInt(block.totalFeeAmount),this.mempoolcharts.fees, HISTORY_BLOCKS_LEN);
        ring(new Date(block.timestamp * 1000).toISOString(),this.mempoolcharts.timestamps, HISTORY_BLOCKS_LEN);

        // update averages
        update_history_averages(HISTORY_BLOCKS_LEN, this.homecharts, this.mempoolcharts);

        // update remaining stats
        this.stats.supply = parseFloat(block.alreadyGeneratedCoins * Math.pow(10, 12)).toFixed(2);
        this.stats.supply = (parseInt(this.stats.supply || 0) / Math.pow(10, 12)).toFixed(2 || Math.pow(10, 12).toString().length - 1);
        this.stats.reward = parseFloat(block.reward / CONFIG.COINUNITS).toFixed(4);
        this.stats.emission = parseFloat((block.alreadyGeneratedCoins * Math.pow(10, 12)) / 8400000000000000000 * 10).toFixed(4);
        this.stats.currentdifficulty = block.difficulty;
        this.stats.currenthashrate = block.difficulty / CONFIG.BLOCKTARGETINTERVAL;

        // finally broadcast
        wss.broadcast(JSON.stringify({type:'laststats', data: this.stats}));
        wss.broadcast(JSON.stringify({type:'homecharts', data: this.homecharts}));
        wss.broadcast(JSON.stringify({type:'mempoolcharts', data: this.mempoolcharts}));
        wss.broadcast(JSON.stringify({type:'deepstats', data: this.deep_stats}));

      }.bind(this))
    }
    this.stats.difficulty = getinfo.difficulty;
    this.stats.height = getinfo.height;
    this.stats.lastblockheight = getinfo.height - 1;
    this.stats.tx_count = getinfo.tx_count;
    this.stats.tx_pool_size = getinfo.tx_pool_size;
    if (!historyLocked) {
      //get deep history
      pull_history_blocks(60, this.stats.height);
      historyLocked = true;

      // fetch latest 15 blocks
      alloyrpc.daemon_getblockslist(this.stats.height-1);
      update_history_averages(HISTORY_BLOCKS_LEN, this.homecharts, this.mempoolcharts);

    }
  }.bind(this))

  function pull_history_blocks(len, height) {
    let stopheight = parseInt(height);
    let startheight = parseInt(stopheight - len);

    for (var i = 0; i < len; i++) {
      alloyrpc.daemon_searchblockbyheight(startheight+i,function (block) {
        emitter.emit('history-block',block);
      })
    }

  }

  var ring = function(block, blocks, targetlen){
    if(blocks.length == targetlen){
        blocks.shift();
    }else if(blocks.length > targetlen){
      var blocksDiff = blocks.length - targetlen;
      blocks = blocks.slice(sharesDiff+1,blocks.length);
    }
    blocks.push(block);

    return blocks;
  };

  function update_history_averages(len, homecharts, mempoolcharts) {
    var diffsum = homecharts.difficulties.reduce(add, 0);
    var feesum = mempoolcharts.fees.reduce(add, 0);
    var sizesum = mempoolcharts.sizes.reduce(add, 0);

    function add(a, b) {
      return a + b;
    }

    var stats = {};
    stats.symbol = CONFIG.SYMBOL;
    stats.averagedifficulty = Math.round(diffsum / len);
    stats.averagesize = Math.round(sizesum / len);
    stats.averagefee = Math.round(feesum / len);
    stats.averagehashrate = stats.averagedifficulty / CONFIG.BLOCKTARGETINTERVAL;
    stats.averageblocktime = timeformat(stats.averagedifficulty / stats.averagehashrate);

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
