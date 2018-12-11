require('./lib/utils/logger');

let explorer = require("./lib/explorer");
let helper = require("./lib/utils/helper");
let RPC = require("./lib/utils/rpc");

const http = require('http');
const https = require('https');
const passport = require('passport');
const cors = require('cors');
const helmet = require('helmet');

// PASSPORT
const jwt = require('jwt-simple');
require('./lib/passport')(passport);

// EXPRESS
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const CONFIG = require('./lib/config');
const frontend_port = CONFIG.FRONTEND.PORT;
const frontend_url = CONFIG.FRONTEND.HOST;
const ssl_on = CONFIG.FRONTEND.SSL.ENABLED;

const DB_users = require('./db/users');

const mongoose = require('mongoose');
const mongodbUri = 'mongodb://' + CONFIG.DB.HOST + '/' + CONFIG.DB.DBNAME;
const sslOptions = CONFIG.FRONTEND.SSL;
const wallet_generator = require('./lib/utils/genwallet');
const paper_wallet_config = CONFIG.PAPERWALLET;

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
frontend.use(bodyParser.urlencoded({
  extended: true
}));
frontend.set('views', path.join(__dirname, ('./public/views')));
frontend.use(express.static(path.join(__dirname, ('./dist'))));
frontend.use(cors({
  credentials: true,
  origin: true
}));
frontend.use(helmet.hsts({
      maxAge: 31536000000,
      includeSubdomains: true,
      force: true
}));
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
  }, function(err, user) {
    if (err) throw err;
    if (!user) {
      res.status(401).send({
        msg: 'Authentication failed. user not found'
      });
    } else {
      user.comparePassword(req.body.password, function(err, isMatch) {
        if (isMatch && !err) {
          var iat = new Date().getTime() / 1000;
          var exp = iat + CONFIG.FRONTEND.TOKEN_EXPIRATION;
          var payload = {
            aud: 'https://' + frontend_url,
            iss: CONFIG.EMAIL,
            iat: iat,
            exp: exp,
            sub: user.name
          };
          var token = jwt.encode(payload, CONFIG.ADMIN.SECRET);
          res.json({
            token: 'JWT ' + token
          });
        } else {
          res.status(401).send({
            msg: 'Authentication failed. Wrong password'
          });
        }
      })
    }
  })
});

apiRoutes.get('/getinfo', function(req, res) {
  return res.json(CNExplorer.getinfo);
});

apiRoutes.get('/mempool', function(req, res) {
  return res.json(CNExplorer.mempool);
});

apiRoutes.get('/lastblock', function(req, res) {
  CNExplorer.lastblock.found = timeformat(parseInt(Date.now()/1000) - parseInt(CNExplorer.lastblock.timestamp));
  return res.json(CNExplorer.lastblock);
});

apiRoutes.get('/laststats', function(req, res) {
  return res.json(CNExplorer.stats);
});

apiRoutes.get('/deepstats', function(req, res) {
  return res.json(CNExplorer.deep_stats);
});

apiRoutes.get('/poolstats', function(req, res) {
  return res.json(CNExplorer.pools);
});

apiRoutes.get('/block/:query', function(req, res) {
  if (req.params.query.length < 64) {
    RPC.daemon_searchblockbyheight(req.params.query, function(resp) {
      res.json(resp);
    })
  } else {
    RPC.daemon_searchblockbyhash(req.params.query, function(resp) {
      res.json(resp);
    })
  }
});

apiRoutes.get('/tx/:hash', function(req, res) {
  RPC.daemon_searchtransaction(req.params.hash, function(resp) {
    res.json(resp);
  })
});

apiRoutes.get('/blocks/:height', function(req, res) {
  RPC.daemon_getblockslist(req.params.height, function(resp) {
    res.json(resp);
  })
});

apiRoutes.get('/genwallet', function(req, res) {
  var new_wallet = wallet_generator.genwallet(null, paper_wallet_config);
  res.json(new_wallet);
});

apiRoutes.get('/genwallet/:lang', function(req, res) {
  var new_wallet = wallet_generator.genwallet(req.params.lang, paper_wallet_config);
  res.json(new_wallet);
});

apiRoutes.get('/pid/:payment_id', function(req, res) {
  RPC.daemon_searchpaymentid(req.params.payment_id, function(resp) {
    res.json(resp);
  })
});

frontend.get('/', (req, res) => {
  res.render('index');
});

frontend.get('/dashboard', (req, res) => {
  res.render('admin');
});

if (ssl_on) {
  // listen on frontend_port 80 and redirect to 443
  http.createServer((req, res) => {
    res.writeHead(301, {"Location": "https://" + req.headers['host'] + req.url});
    res.end();
  }).listen(80);

  server = https.createServer(sslOptions,frontend);
}else {
  // ssl handled by nginx
  server = http.createServer(frontend);
}

server.on('error', function(e) {
  console.log(JSON.stringify(e))
});

/**
 * Websockets
 */

const Primus = require('primus');
const Rooms = require('primus-rooms');

/**
 * START Socket Servers
 */

const primus = new Primus(server, {
  transformer: 'websockets',
  pathname: '/cnexplorer_socket',
  parser: 'JSON'
});

primus.plugin('emit', require('primus-emit'));
primus.plugin('rooms', Rooms);

let CNExplorer = new explorer(primus);

initDB();

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
    console.success('emp-start', 'Connected to EMP %s at %s:', mongodbUri, new Date());

    CNExplorer.init('data');

    // check if users exist
    DB_users.find({}, (err, users) => {
      if (err) throw err;
      if (users.length == 0) {
        let user = new DB_users({
          name: CONFIG.ADMIN.USERNAME,
          password: CONFIG.ADMIN.PASSWORD
        });
        user.save(function(err) {
          if (err) throw err;
          console.success('emp-start', 'Administration account created. You can login at %s:%s/admin', frontend_url, frontend_port);
        })
      }
    })
  });
}

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
