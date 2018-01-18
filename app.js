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
const DB_pooldata = require('./db/pooldata');
const DB_mempool = require('./db/mempool');

let GETINFO = {};
let LASTBLOCKHEADER = {};
let MEMPOOL = [];
let LASTBLOCKS = [];
let LASTBLOCK = {};

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
      type: 'getinfo',
      data: GETINFO
    }), function () { /* ignore errors */ });
    ws.send(JSON.stringify({
      type: 'mempool',
      data: MEMPOOL
    }), function () { /* ignore errors */ });
    ws.send(JSON.stringify({
      type: 'lastblock',
      data: LASTBLOCK
    }), function () { /* ignore errors */ });
    ws.send(JSON.stringify({
      type: 'lastblocks',
      data: LASTBLOCKS
    }), function () { /* ignore errors */ });


    ws.on('pong', function heartbeat() {
      ws.isAlive = true;
      ws.send(JSON.stringify('ping'));
    });

    ws.on('message', function incoming(message) {

    });

    let socketreply = setInterval(function () {
      ws.send(JSON.stringify({
        type: 'getinfo',
        data: GETINFO
      }), function () { /* ignore errors */ });
      ws.send(JSON.stringify({
        type: 'mempool',
        data: MEMPOOL
      }), function () { /* ignore errors */ });
      ws.send(JSON.stringify({
        type: 'lastblock',
        data: LASTBLOCK
      }), function () { /* ignore errors */ });
      ws.send(JSON.stringify({
        type: 'lastblocks',
        data: LASTBLOCKS
      }), function () { /* ignore errors */ });
    }, 10000);

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
                data: []
            });

            newpool.save(function (err) {
              if (err) console.log(err);
              console.success('emp-start','New pool added to DB! %s', poolApi.frontend);

              let newpooldata = new DB_pooldata({
                frontend: poolApi.frontend,
                config: config,
                pool: pool,
                network: network
              });
              newpooldata.save(function (err) {
                if (err) console.log(err);
                console.success('emp-start','New data added for pool! %s', poolApi.frontend);


              })
            })
          }else {

            let newpooldata = new DB_pooldata({
              frontend: poolApi.frontend,
              config: config,
              pool: pool,
              network: network
            });
            newpooldata.save(function (err) {
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
        method: "f_pool_json",
        params: {}
  })
  .then(summary => {
    const mempoolstring = summary.data;
    let rawTxs = mempoolstring.split('"transactions":"').pop();
    rawTxs = rawTxs.split('"}}')[0];
    MEMPOOL = [];
    let txsArray = [];
    txsArray = rawTxs.split('\n\n');
    txsArray.forEach(function(tx, i) {
      let arrayOfLines = tx.split('\n');
      let hash = arrayOfLines[0].split(': ').pop();

      if (hash != "") {
        hash = hash.slice(1, -1);
        let timestamp = arrayOfLines[8].split('received:').pop();
        timestamp = new Date(timestamp).getTime();
        let fee = arrayOfLines[2].split(':').pop();
        let size = arrayOfLines[1].split(':').pop();
        MEMPOOL.push({
          hash: hash,
          fee: fee,
          size: size,
          firstseen: timestamp
        })
      }

    });
    new DB_pooldata(MEMPOOL).save(function (err) {
      if (err) console.log(err);
      console.success('emp-start','Updated mempool info!');
    })
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
