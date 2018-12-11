'use strict';

var CNExplorer = angular.module('CNExplorer', [
	'CNExplorer.filters',
	'CNExplorer.directives',
	'CNExplorer.services',
	'ngRoute',
	'ngDialog',
	'tooltips',
	'tableSort',
	'dt-hamburger-menu'
]).config(['$locationProvider', function($locationProvider) {
  $locationProvider.hashPrefix('');
}]).config(function($routeProvider, $locationProvider) {
	$routeProvider
		.when('/', {
			templateUrl: '../templates/home.html',
			controllerAs: 'home_controller'
		})
		.when('/mempool', {
			templateUrl: '../templates/mempool.html',
			controllerAs: 'mempool_controller'
		})
		.when('/block/:blockhash', {
			templateUrl: '../templates/block.html',
			controllerAs: 'block_controller'
		})
		.when('/tx/:txhash', {
			templateUrl: '../templates/transaction.html',
			controllerAs: 'transaction_controller'
		})
		.when('/paymentid/:pidhash', {
			templateUrl: '../templates/paymentid.html',
			controllerAs: 'paymentid_controller'
		})
		.when('/pools', {
			templateUrl: '../templates/pools.html',
			controllerAs: 'pools_controller'
		})
		.when('/remotes', {
			templateUrl: '../templates/remotes.html',
			controllerAs: 'remotes_controller'
		})
		.when('/paperwallet', {
			templateUrl: '../templates/paperwallet.html',
			controllerAs: 'paperwallet_controller'
		})
		.otherwise({
			redirectTo: '/'
		});
}).config(['$httpProvider', function($httpProvider) {
    $httpProvider.interceptors.push('logTimeTaken');
}]);
