require('./lib/utils/logger');

const axios = require('axios');
const http = require('http');
const passport = require('passport');
const fs = require('fs');
const async = require('async');
const cors = require('cors');

const emitter = require('./lib/utils/events');
emitter.setMaxListeners(0);

// PASSPORT
const jwt = require('jwt-simple');
require('./lib/passport')(passport);

// EXPRESS
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const CONFIG = require('./lib/config');
const frontend_port = CONFIG.FRONTEND.PORT;
const frontend_url  = CONFIG.FRONTEND.HOST;

const DB_users = require('./db/users');
const DB_pools = require('./db/pools');

const DB_mempool = require('./db/mempool');
const timer = ms => new Promise( res => setTimeout(res, ms));

let GETINFO = {};
let LASTBLOCKHEADER = {};
let MEMPOOL = [];
let LASTBLOCKS = [];
let LASTBLOCK = {};
let HISTORY_BLOCKS = [];
let HISTORY_BLOCKS_LEN = 60;
let HISTORY_BLOCKS_INTERVAL = 60 * 1000;
let parsedHistory = false;

var explorer_charts = {
  blocks : [],
  txses : [],
  sizes : [],
  timestamps : []
};

var deep_charts = {
  difficulties : [],
  blocks : [],
  txses : [],
  sizes : [],
  fees : [],
  timestamps : []
};

let explorer_stats = {
  symbol: CONFIG.SYMBOL
};

let deep_stats = {
  averagehashrate : 0,
  averagedifficulty: 0,
  averageblocktime: 0,
  averagefee: 0,
  averagesize: 0,
  symbol: CONFIG.SYMBOL
};

let savedheight = 0;
let emissionpercent = 0;
let server;

/**
 * Frontend SERVER
 */

let frontend = express();
let apiRoutes = express.Router();

// Use the passport package in our application
frontend.use(passport.initialize());

// view engine setup
frontend.set('view engine', 'pug');
frontend.use(bodyParser.json());
frontend.use(bodyParser.urlencoded({ extended: true }));
frontend.set('views', path.join(__dirname, ('./public/views')));
frontend.use(express.static(path.join(__dirname, ('./dist'))));
frontend.use(cors({credentials: true, origin: true}));
frontend.use('/api/v1', apiRoutes);

// catch 404 and forward to error handler
frontend.use((req, res, next) => {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers
frontend.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: err
  });
});

// authenticate existing user account (POST /api/authenticate)
apiRoutes.post('/authenticate', function(req, res) {
    DB_users.findOne({
        name: req.body.name
    }, function (err, user) {
        if (err) throw err;
        if (!user) {
            res.status(401).send({msg: 'Authentication failed. user not found'});
        } else {
            user.comparePassword(req.body.password, function(err, isMatch) {
                if (isMatch && !err) {
                    var iat = new Date().getTime() / 1000;
                    var exp = iat + CONFIG.FRONTEND.TOKEN_EXPIRATION;
                    var payload = {
                        aud: 'http://' + frontend_url + ':' + frontend_port,
                        iss: CONFIG.EMAIL,
                        iat: iat,
                        exp: exp,
                        sub: user.name
                    };
                    var token = jwt.encode(payload, CONFIG.ADMIN.SECRET);
                    res.json({token: 'JWT ' + token});
                } else {
                    res.status(401).send({msg: 'Authentication failed. Wrong password'});
                }
            })
        }

    })
});

apiRoutes.get('/getinfo', function(req, res){
  return res.json(GETINFO);
});

apiRoutes.get('/mempool', function(req, res){
  return res.json(MEMPOOL);
});

apiRoutes.get('/lastblock', function(req, res){
  return res.json(LASTBLOCK);
});

apiRoutes.get('/laststats', function(req, res){
  return res.json(explorer_stats);
});

apiRoutes.get('/deepstats', function(req, res){
  return res.json(deep_stats);
});

apiRoutes.get('/block/:query', function(req, res){
  if(req.params.query.length < 64) {
    daemon_searchblockbyheight(req.params.query, function(resp) {
      res.json(resp);
    })
  }else {
    daemon_searchblockbyhash(req.params.query, function(resp) {
      res.json(resp);
    })
  }
});

apiRoutes.get('/tx/:hash', function(req, res){
  daemon_searchtransaction(req.params.hash, function(resp) {
    res.json(resp);
  })
});

apiRoutes.get('/blocks/:height', function(req, res){
  daemon_getblockslist(req.params.height, function(resp) {
    res.json(resp);
  })
});

apiRoutes.get('/pid/:payment_id', function(req, res){
  daemon_searchpaymentid(req.params.payment_id, function(resp) {
    res.json(resp);
  })
});

frontend.get('/', (req, res) => {
  res.render('index');
});

frontend.get('/mempool', (req, res) => {
  res.render('mempool');
});

frontend.get('/dashboard', (req, res) => {
  res.render('admin');
});

server = http.createServer(frontend);
server.on('error', function(e) {
  console.log(JSON.stringify(e))
});

/**
 * Websockets
 */

 const WebSocket = require('ws');
 const wss = new WebSocket.Server({ server });
 function noop() {}

 wss.on('connection', function connection(ws) {
    ws.isAlive = true;

    ws.send(JSON.stringify('ping'));

    ws.send(JSON.stringify({
      type: 'mempool',
      data: MEMPOOL
    }), function () { /* ignore errors */ });
    ws.send(JSON.stringify({
      type: 'lastblocks',
      data: LASTBLOCKS
    }), function () { /* ignore errors */ });
    ws.send(JSON.stringify({
      type: 'laststats',
      data: explorer_stats
    }), function () { /* ignore errors */ });
    ws.send(JSON.stringify({
      type: 'lastcharts',
      data: explorer_charts
    }), function () { /* ignore errors */ });

    ws.send(JSON.stringify({
      type: 'deepstats',
      data: deep_stats
    }), function () { /* ignore errors */ });
    ws.send(JSON.stringify({
      type: 'deepcharts',
      data: deep_charts
    }), function () { /* ignore errors */ });


    ws.on('pong', function heartbeat() {
      ws.isAlive = true;
      ws.send(JSON.stringify('ping'));
    });

    ws.on('message', function incoming(message) {
      if (message === 'refreshblocks') {
        console.log('got refresh request');
        daemon_getlastblocks();
        ws.send(JSON.stringify({
          type: 'lastblocks',
          data: LASTBLOCKS
        }));
      }
    });

    let socketreply = setInterval(function () {
      ws.send(JSON.stringify({
        type: 'mempool',
        data: MEMPOOL
      }), function () { /* ignore errors */ });
      ws.send(JSON.stringify({
        type: 'laststats',
        data: explorer_stats
      }), function () { /* ignore errors */ });
      ws.send(JSON.stringify({
        type: 'deepstats',
        data: deep_stats
      }), function () { /* ignore errors */ });

      if (savedheight == 0 || savedheight !== explorer_stats.bestheight) {
        // no height saved or updating
        savedheight = explorer_stats.bestheight;
        ws.send(JSON.stringify({
          type: 'deepcharts',
          data: deep_charts
        }), function () { /* ignore errors */ });
        ws.send(JSON.stringify({
          type: 'lastcharts',
          data: explorer_charts
        }), function () { /* ignore errors */ });
        ws.send(JSON.stringify({
          type: 'lastblocks',
          data: LASTBLOCKS
        }), function () { /* ignore errors */ });
      }

    }, 15000);

    ws.on('close', function () {
      clearInterval(socketreply);
    });
 });

 const interval = setInterval(function ping() {
   wss.clients.forEach(function each(ws) {
     if (ws.isAlive === false) return ws.terminate();

     ws.isAlive = false;
     ws.ping(noop);
   });
 }, 30000);

function checkPool(poolApi) {
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
              console.success('emp-start','Updated data for pool! %s', poolApi.frontend);

            })

          }
      })
    }

  })
  .catch(err => console.error('emp-start','Pool not present %s',err.config.url))
  setTimeout(() => {
    checkPool(poolApi)
  }, 60000)
}

function daemon_getinfo() {
  axios.get(CONFIG.DAEMON + '/getinfo')
  .then(summary => {
    GETINFO = summary.data;
    explorer_stats.tx_count = GETINFO.tx_count;
    explorer_stats.tx_pool_size = GETINFO.tx_pool_size;
  })
  .catch(err => console.error('emp-start','Cannot reach daemon %s',err.config.url))
  setTimeout(() => {
    daemon_getinfo()
  }, 5000)
}
function daemon_lastblockheader() {
  axios.post(CONFIG.DAEMON + '/json_rpc',{
        jsonrpc:"2.0",
        id: "test",
        method:"getlastblockheader",
        params: {}
  })
  .then(summary => {
    LASTBLOCKHEADER = summary.data.result.block_header;
    daemon_searchblockbyhash(summary.data.result.block_header.hash, function (result) {
        LASTBLOCK = result;
        explorer_stats.bestheight = result.height;
        explorer_stats.supply = parseFloat(LASTBLOCK.alreadyGeneratedCoins * Math.pow(10, 12)).toFixed(2);
        explorer_stats.supply = (parseInt(explorer_stats.supply || 0) / Math.pow(10, 12)).toFixed(2 || Math.pow(10, 12).toString().length - 1);
        explorer_stats.reward = parseFloat(LASTBLOCK.reward / CONFIG.COINUNITS).toFixed(4);
        explorer_stats.emission = parseFloat((LASTBLOCK.alreadyGeneratedCoins * Math.pow(10, 12)) / 8400000000000000000 * 10).toFixed(4);
        explorer_stats.currentdifficulty = result.difficulty;
        explorer_stats.currenthashrate = result.difficulty / CONFIG.BLOCKTARGETINTERVAL;
    })
  })
  .catch(err => console.error('emp-start','Cannot reach daemon %s',err.config.url))
  setTimeout(() => {
    daemon_lastblockheader()
  }, 15000)
}
function daemon_searchblockbyhash(query, cb) {
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
      cb(summary.data.result.block);
    }
  })
  .catch(err => console.error('emp-start','Cannot reach daemon %s',err))
}

function daemon_searchblockbyheight(query, cb) {
  axios.post(CONFIG.DAEMON + '/json_rpc',{
      jsonrpc:"2.0",
      id: "blockbyheight",
      method:"getblockheaderbyheight",
      params: {
         height: parseInt(query)
      }
  })
  .then(summary => {
    if (summary.data.result) {
      daemon_searchblockbyhash(summary.data.result.block_header.hash, function (result) {
          cb(result);
      })

    }
  })
  .catch(err => console.error('emp-start','Cannot reach daemon %s',err))
}

function daemon_searchtransaction(query, cb) {
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
      cb(summary.data.result);
    }
  })
  .catch(err => console.error('emp-start','Cannot reach daemon %s',err.config.url))
}

function daemon_getblockslist(query, cb) {
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
      cb(summary.data.result.blocks);
    }
  })
  .catch(err => console.error('emp-start','Cannot reach daemon %s',err.config.url))
}

function daemon_getlastblocks() {
  axios.post(CONFIG.DAEMON + '/json_rpc',{
      jsonrpc:"2.0",
      id: "test",
      method:"f_blocks_list_json",
      params: {
         height: parseInt(LASTBLOCKHEADER.height)
      }
  })
  .then(summary => {
    if (summary.data.result) {
      LASTBLOCKS = summary.data.result.blocks;
      explorer_charts = {
        blocks : [],
        txses : [],
        sizes : [],
        timestamps : []
      };

      for (var i = 0; i < LASTBLOCKS.length; i++) {

        explorer_charts.blocks.push(parseInt(LASTBLOCKS[i].height));
        explorer_charts.txses.push(parseInt(LASTBLOCKS[i].tx_count));
        explorer_charts.sizes.push(parseInt(LASTBLOCKS[i].cumul_size));
        explorer_charts.timestamps.push(new Date(LASTBLOCKS[i].timestamp * 1000).toISOString());

      }

    }
  })
  .catch(err => console.error('emp-start','Cannot reach daemon %s',err.config.url))
  setTimeout(function () {
    daemon_getlastblocks();
  }, 15000);
}

function daemon_searchpaymentid(query, cb) {
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
      cb(summary.data.result);
    }
  })
  .catch(err => console.error('emp-start','Cannot reach daemon %s',err.config.url))
}

function daemon_mempool() {
  axios.post(CONFIG.DAEMON + '/json_rpc',{
        jsonrpc: "2.0",
        id: "test",
        method: "f_on_transactions_pool_json",
        params: {}
  })
  .then(summary => {
    let txs = summary.data.result.transactions;
    MEMPOOL = [];
    for (var i = 0; i < txs.length; i++) {
      if (txs[i].hash != "") {
        MEMPOOL.push(txs[i]);
      }
    }
    initMempoolDB(MEMPOOL);
  })
  .catch(err => console.error('emp-start','Cannot reach daemon %s',err.config.url))
  setTimeout(() => {
    daemon_mempool()
  }, 15000)
}

function setupDB() {

  /**
   * Main DB Connection
   */

  const mongoose = require('mongoose');
  const mongodbUri = 'mongodb://' + CONFIG.DB.HOST + '/' + CONFIG.DB.DBNAME;

  mongoose.Promise = global.Promise;
  mongoose.connect(mongodbUri, {
    keepAlive: true,
    reconnectTries: CONFIG.DB.RETRIES,
    useMongoClient: true
  });

  let connection = mongoose.connection;

  connection.on('error', console.error.bind(console, 'connection error:'));

  // mongodb connection open
  connection.once('open', () => {
    console.success('emp-start','Connected to EMP %s at %s:', mongodbUri, new Date());

    // check if users exist
    DB_users.find({}, (err, users) => {
        if (err) throw err;
        if (users.length == 0) {
          let user = new DB_users({
              name: CONFIG.ADMIN.USERNAME,
              password: CONFIG.ADMIN.PASSWORD
          });
          user.save(function (err) {
            if (err) throw err;
            console.success('emp-start','Administration account created. You can login at %s:%s/admin', frontend_url, frontend_port);
          })
        }
    })


  });

}

function initMempoolDB(_mpool) {

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
          console.success('emp-start','Updated mempool data!');
        });

      }
  })
}

function updatehistoryaverages() {
  var diffsum = deep_charts.difficulties.reduce(add, 0);
  var feesum = deep_charts.fees.reduce(add, 0);
  var sizesum = deep_charts.sizes.reduce(add, 0);

  function add(a, b) {
    return a + b;
  }

  deep_stats.averagedifficulty = Math.round(diffsum / deep_charts.difficulties.length);
  deep_stats.averagesize = Math.round(sizesum / deep_charts.sizes.length);
  deep_stats.averagefee = Math.round(feesum / deep_charts.fees.length);
  deep_stats.averagehashrate = deep_stats.averagedifficulty / CONFIG.BLOCKTARGETINTERVAL;
  deep_stats.averageblocktime = timeformat(deep_stats.averagedifficulty / deep_stats.averagehashrate);

}

function timeformat(seconds) {

  var units = [
    [60, 's.'],
    [60, 'min.'],
    [24, 'h.'],
    [7, 'd.'],
    [4, 'w.'],
    [12, 'м.'],
    [1, 'y.']
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

function setupPools() {

  /**
   * Fetch pool data
   */

   async.each(CONFIG.POOLS,function(pool,callback) {
     checkPool(pool);
     callback();
   },function() {
     console.success('emp-start','All pool data collected');

   })

}

emitter.on('historyBlock', function(block) {
  HISTORY_BLOCKS.push(block);
});

function pullHistoryBlocks(len) {
  let heights = [];
  let stopheight = parseInt(LASTBLOCKHEADER.height + 1);
  let startheight = parseInt(stopheight - len);

  for (var i = 0; i < len; i++) {
    daemon_searchblockbyheight(startheight+i,function (resp) {
      emitter.emit('historyBlock', resp);
    })
    timer(300);
    if (i == len-1) {
      console.info('emp-start','Finished collecting chain history from last %s blocks', len);
    }
  }
  parsedHistory = false;

}

setInterval(function () {
  if (HISTORY_BLOCKS.length > 0 && !parsedHistory) {
    //reset charts
    deep_charts = {
      difficulties : [],
      blocks : [],
      txses : [],
      sizes : [],
      fees : [],
      timestamps : []
    };
    parseHistoryBlocks(HISTORY_BLOCKS);
    parsedHistory = true;
  }
  if (parsedHistory || HISTORY_BLOCKS.length == 0) {
    HISTORY_BLOCKS = [];
    pullHistoryBlocks(HISTORY_BLOCKS_LEN);
  }

}, HISTORY_BLOCKS_INTERVAL);

function parseHistoryBlocks(blocks) {

  for (var i = 0; i < blocks.length; i++) {
    deep_charts.difficulties.push(parseInt(blocks[i].difficulty));
    deep_charts.blocks.push(parseInt(blocks[i].height));
    deep_charts.txses.push(parseInt(blocks[i].transactions.length));
    deep_charts.sizes.push(parseInt(blocks[i].transactionsCumulativeSize));
    deep_charts.fees.push(parseInt(blocks[i].totalFeeAmount,10));
    deep_charts.timestamps.push(new Date(blocks[i].timestamp * 1000).toISOString());

    }
    console.info('emp-start','Parsed chain history');

    updatehistoryaverages();
  }

var gracefulShutdown = function() {
	console.log('');
    console.error("xxx", "sys", "Received kill signal, shutting down gracefully.");
    setTimeout(() => {
        console.log("xxx", "sys", "Closed out remaining connections.");
        process.exit(0);
    }, 1000);
}

setupDB();
setupPools();
daemon_getinfo();
daemon_lastblockheader();
daemon_mempool();
daemon_getlastblocks();
pullHistoryBlocks(HISTORY_BLOCKS_LEN);

server.listen(frontend_port);

// listen for TERM signal .e.g. kill
process.on('SIGTERM', gracefulShutdown);

// listen for INT signal e.g. Ctrl-C
process.on('SIGINT', gracefulShutdown);

// listen for shutdown signal from pm2
process.on('message', (msg) => {
	if (msg === 'shutdown')
		gracefulShutdown();
});

module.exports = server;
