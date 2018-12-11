angular.module('CNExplorer.services', [])

.factory('toastr', function ($rootScope) {
	toastr = window.toastr;
	toastr.options = {
		"closeButton": false,
		"debug": false,
		"progressBar": false,
		"newestOnTop": true,
		"positionClass": "toast-top-right",
		"preventDuplicates": false,
		"onclick": null,
		"showDuration": "300",
		"hideDuration": "1000",
		"timeOut": "5000",
		"extendedTimeOut": "1000",
		"showEasing": "swing",
		"hideEasing": "linear",
		"showMethod": "fadeIn",
		"hideMethod": "fadeOut"
	};
	return toastr;
})
.factory('storagefactory', ['$log', function($log) {
	var storage = {
			data : {},
			storage_id: 'LS_', // You can make this whatever you want
			get: function( key )  {
					var data , result;

					try{
							data = localStorage.getItem(this.storage_id+key);
					} catch(e){}

					try {
							result = JSON.parse(data);
					} catch(e) {
							result = data;
					}

					//$log.info('>> storageService',key,result);
					return result;
			},
			set: function(key,data){
					if (typeof data == "object"){
							data = JSON.stringify(data);
					}

					try{
							localStorage.setItem(this.storage_id+key, data);
					} catch(e){
							$log.error('!! storageService',e);
					}
			},
			remove: function(key)  {
					try {
							var status = localStorage.removeItem(this.storage_id+key);
							$log.info('-- storageService',key);
							return status;
					} catch( e ){
							$log.error('!! storageService',e);
							return false;
					}
			}
	};
	return storage;
}])
.factory('logTimeTaken', [function() {
    var logTimeTaken = {
        request: function(config) {
            config.requestTimestamp = new Date().getTime();
            return config;
        },
        response: function(response) {
            response.config.responseTimestamp = new Date().getTime();
            return response;
        }
    };
    return logTimeTaken;
}])
.factory('_', function ($rootScope) {
	var lodash = window._;
	return lodash;
})
.factory('socket', function ($rootScope) {
	var socket = new Primus();
	return socket;
})
.factory('api', ['$http', '$rootScope', function ($http, $rootScope) {
    var factory = {};

    var apiurl = '/api/v1/';

		factory.getblockslist = function (height, callback) {
        var req = {
            method: 'GET',
            url: apiurl + 'blocks/' + height
        };
        $http(req).then(function (response) {
            callback(response.data);
        });
    };

		factory.getblock = function (query, callback) {
        var req = {
            method: 'GET',
            url: apiurl + 'block/' + query
        };
        $http(req).then(function (response) {
            callback(response.data);
        });
    };

		factory.gettx = function (hash, callback) {
        var req = {
            method: 'GET',
            url: apiurl + 'tx/' + hash
        };
        $http(req).then(function (response) {
            callback(response.data);
        });
    };

    return factory;
}])
