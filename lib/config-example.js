module.exports = {
  "NAME": "Alloy  Explorer",
  "ADMIN": {
    "USERNAME": "ADMIN_USERNAME",
    "PASSWORD": "ADMIN_SECURE_PASSWORD",
    "SECRET": "SOME_SECRET_STRING"
  },
  "EMAIL": "YOUR_EMAIL",
  "DB": {
    "HOST": 'localhost',
    "DBNAME": 'DB_NAME',
    "RETRIES": 50
  },
  "FRONTEND": {
    "HOSTNAME": 'alloyexplorer.com',
    "HOST": '0.0.0.0',
    "PORT": 3000,
    'TOKEN_EXPIRATION': 60 * 20
  },
  "DAEMON": "DAEMON_RPC_URL",
  "BLOCKTARGETINTERVAL" : 180,
  "COINUNITS" : Math.pow(10, 12),
  "SYMBOL" : "XAO",
  "POOLS":[{
    "frontend": "alloypool.com",
    "api": "https://alloypool.com/api/stats"
  },{
    "frontend": "POOL_HOST",
    "api": "POOL_STATS_API"
  }],
  "VERBOSITY": 2
}
