module.exports = {
  "NAME": "Alloy Explorer",
  "ADMIN": {
    "USERNAME": "alloyex",
    "PASSWORD": "", //some secure password
    "SECRET": "" //some secret string (ex: G5SMbCPo3AHBQP1QcIFNN68yaPFjYJBI)
  },
  "EMAIL": "", //email used for notifications
  "DB": {
    "HOST": 'localhost',
    "DBNAME": 'alloyexplorer',
    "RETRIES": 50
  },
  "FRONTEND": {
    "HOSTNAME": 'alloyexplorer.com',
    "HOST": '0.0.0.0',
    "PORT": 3000,
    'TOKEN_EXPIRATION': 60 * 20,
  },
  "DAEMON": "http://xao.vps-city.com:12410",
  "POOLS":[{
    "frontend": "alloyexplorer.com",
    "api": "http://alloyexplorer.com:8117/stats"
  }],
  "VERBOSITY": 2
}
