angular.module('AlloyEX.services', [])

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

.factory('_', function ($rootScope) {
	var lodash = window._;
	return lodash;
})

.factory('ApiFactory', ['$http', '$rootScope', function ($http, $rootScope) {
    var factory = {};

    var url = '/';

    factory.authenticate = function (user, callback) {
        $http.post(url + 'api/authenticate', user).then(function (response) {
            callback(null, response.data);
        }, function (err) {
            console.log(err);
        });
    };

    factory.signup = function (user, callback) {
        $http.post(url + 'api/signup', user).then(function (response) {
            callback(null, response.data);
        }, function (err) {
            callback(err);
        });
    };

    factory.getNames = function (callback) {
        console.log($rootScope.token);
        var req = {
            method: 'GET',
            url: url + 'api/names',
            headers: {
                'Authorization' : $rootScope.token
            }
        };
        $http(req).then(function (response) {
            callback(response.data);
        });
    };

    return factory;
}])
