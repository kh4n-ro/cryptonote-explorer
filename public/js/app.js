'use strict';

var AlloyEX = angular.module('AlloyEX', [
	'AlloyEX.filters',
	'AlloyEX.directives',
	'AlloyEX.services',
	'ngStorage',
	'ngRoute',
	'ngDialog',
	'tooltips',
	'tableSort'
]).config(function($routeProvider, $locationProvider) {
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
		.otherwise({
			redirectTo: '/'
		});
});
