require('./lib/utils/logger');

let explorer = require("./lib/explorer");
let helper = require("./lib/utils/helper");
let alloyrpc = require("./lib/utils/alloyrpc");

const http = require('http');
const passport = require('passport');
const cors = require('cors');

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
const mongoose = require('mongoose');
const mongodbUri = 'mongodb://' + CONFIG.DB.HOST + '/' + CONFIG.DB.DBNAME;

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
  return res.json(AlloyEX.getinfo);
});

apiRoutes.get('/mempool', function(req, res){
  return res.json(AlloyEX.mempool);
});

apiRoutes.get('/lastblock', function(req, res){
  return res.json(AlloyEX.lastblock);
});

apiRoutes.get('/laststats', function(req, res){
  return res.json(AlloyEX.explorer_stats);
});

apiRoutes.get('/deepstats', function(req, res){
  return res.json(AlloyEX.deep_stats);
});

apiRoutes.get('/block/:query', function(req, res){
  if(req.params.query.length < 64) {
    alloyrpc.daemon_searchblockbyheight(req.params.query, function(resp) {
      res.json(resp);
    })
  }else {
    alloyrpc.daemon_searchblockbyhash(req.params.query, function(resp) {
      res.json(resp);
    })
  }
});

apiRoutes.get('/tx/:hash', function(req, res){
  alloyrpc.daemon_searchtransaction(req.params.hash, function(resp) {
    res.json(resp);
  })
});

apiRoutes.get('/blocks/:height', function(req, res){
  alloyrpc.daemon_getblockslist(req.params.height, function(resp) {
    res.json(resp);
  })
});

apiRoutes.get('/pid/:payment_id', function(req, res){
  alloyrpc.daemon_searchpaymentid(req.params.payment_id, function(resp) {
    res.json(resp);
  })
});

frontend.get('/', (req, res) => {
  res.render('index');
});

frontend.get('/dashboard', (req, res) => {
  res.render('admin');
});

server = http.createServer(frontend,function (req, res) {
  server.listen(frontend_port);
});

server.on('error', function(e) {
  console.log(JSON.stringify(e))
});

/**
 * Websockets
 */

 const WebSocket = require('ws');
 const wss = new WebSocket.Server({ server });
 function noop() {}

 // Broadcast to all.
 wss.broadcast = function broadcast(data) {
    var length = wss.clients.length;
    for(var i = 0; i < length; i++){
        if(wss.clients[i].readyState != WebSocket.OPEN){
            // console.error('Client state is ' + wss.clients[i].readyState);
        }
        else{
            // console.log('broadcasting data');
            wss.clients[i].send(data);
        }
    }

 };

 wss.on('connection', function connection(ws) {
    let explorer_reply;
    let mempool_reply;
    let txpage_reply;
    ws.isAlive = true;

    ws.send(JSON.stringify('ping'));

    ws.on('pong', function heartbeat() {
      ws.isAlive = true;
      ws.send(JSON.stringify('ping'));
    });

    ws.on('message', function incoming(message) {
      // catch page transitions
      if (message === 'alloyex-main') {
        /**
         * data: AlloyEX.blockslist, AlloyEX.deep_stats, AlloyEX.stats
         * charts: AlloyEX.homecharts, AlloyEX.average_charts
         */

         ws.send(JSON.stringify({
           type: 'lastblocks',
           data: AlloyEX.blockslist
         }), function () { /* ignore errors */ });

         ws.send(JSON.stringify({
           type: 'deepstats',
           data: AlloyEX.deep_stats
         }), function () { /* ignore errors */ });

         ws.send(JSON.stringify({
           type: 'laststats',
           data: AlloyEX.stats
         }), function () { /* ignore errors */ });

         ws.send(JSON.stringify({
           type: 'homecharts',
           data: AlloyEX.homecharts
         }), function () { /* ignore errors */ });

         ws.send(JSON.stringify({
           type: 'average_charts',
           data: AlloyEX.average_charts
         }), function () { /* ignore errors */ });

         explorer_reply = setInterval(function () {

           ws.send(JSON.stringify({
             type: 'deepstats',
             data: AlloyEX.deep_stats
           }), function () { /* ignore errors */ });

           ws.send(JSON.stringify({
             type: 'laststats',
             data: AlloyEX.stats
           }), function () { /* ignore errors */ });

         }, 10 * 1000);

      } else if (message === 'alloyex-mempool') {

        /**
         * data: AlloyEX.mempool, AlloyEX.deep_stats, AlloyEX.stats
         * charts: AlloyEX.mempoolcharts, AlloyEX.average_charts
         */

         ws.send(JSON.stringify({
           type: 'mempool',
           data: AlloyEX.mempool
         }), function () { /* ignore errors */ });

         ws.send(JSON.stringify({
           type: 'deepstats',
           data: AlloyEX.deep_stats
         }), function () { /* ignore errors */ });

         ws.send(JSON.stringify({
           type: 'laststats',
           data: AlloyEX.stats
         }), function () { /* ignore errors */ });

         ws.send(JSON.stringify({
           type: 'mempoolcharts',
           data: AlloyEX.mempoolcharts
         }), function () { /* ignore errors */ });

         ws.send(JSON.stringify({
           type: 'average_charts',
           data: AlloyEX.average_charts
         }), function () { /* ignore errors */ });

         mempool_reply = setInterval(function () {

           ws.send(JSON.stringify({
             type: 'deepstats',
             data: AlloyEX.deep_stats
           }), function () { /* ignore errors */ });

           ws.send(JSON.stringify({
             type: 'laststats',
             data: AlloyEX.stats
           }), function () { /* ignore errors */ });

           ws.send(JSON.stringify({
             type: 'mempool',
             data: AlloyEX.mempool
           }), function () { /* ignore errors */ });

         }, 10 * 1000);

      } else if (message === 'pools-page')  {


      } else if (message === 'alloyex-txpage')  {

        ws.send(JSON.stringify({
          type: 'laststats',
          data: AlloyEX.stats
        }), function () { /* ignore errors */ });

        txpage_reply = setInterval(function () {
          ws.send(JSON.stringify({
            type: 'laststats',
            data: AlloyEX.stats
          }), function () { /* ignore errors */ });
        }, 10 * 1000);

      }

    });

    ws.on('close', function () {
      clearInterval(mempool_reply);
      clearInterval(explorer_reply);
    });
 });

 const interval = setInterval(function ping() {
   wss.clients.forEach(function each(ws) {
     if (ws.isAlive === false) return ws.terminate();

     ws.isAlive = false;
     ws.ping(noop);
   });
 }, 30000);

function initDB() {
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

    AlloyEX.init('data');

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

initDB();



let AlloyEX = new explorer(wss);

var gracefulShutdown = function() {
	console.log('');
    console.error("xxx", "sys", "Received kill signal, shutting down gracefully.");
    setTimeout(() => {
        console.log("xxx", "sys", "Closed out remaining connections.");
        process.exit(0);
    }, 1000);
}

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
