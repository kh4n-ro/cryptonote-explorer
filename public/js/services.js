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

    return factory;
}])
