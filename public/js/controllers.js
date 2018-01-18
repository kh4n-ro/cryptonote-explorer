AlloyEX.controller('explorer_controller', ['$scope', '$filter', '$interval', '$localStorage', function($scope, $filter, $interval, $rootScope) {
    var host = window.document.location.host.replace(/:.*/, '');
    var ws = new WebSocket('ws://' + host + ':3000');

    var vm = this;

    vm.getinfo = {};
    vm.mempool = [];
    vm.lastblock = {};
    vm.lastblocks = [];
    vm.currentdifficulties = [];
    vm.blockTargetInterval = 180;
    vm.averagehashrate = 0;
    vm.averagedifficulty = 0;
    vm.emission = 0;


    // Socket listeners
    // ----------------

    ws.onmessage = function (event) {
      // console.log(JSON.parse(event.data));
      var resp = JSON.parse(event.data);

      if (resp === 'ping') {
        ws.send('pong');
      }

      if (resp.type === 'getinfo') {
        vm.getinfo = resp.data;
      }
      if (resp.type === 'mempool') {
        vm.mempool = resp.data;
      }
      if (resp.type === 'lastblock') {
        vm.lastblock = resp.data;
        vm.emission = ((vm.lastblock.alreadyGeneratedCoins * Math.pow(10, 12)) / 10000000000000000000 * 100).toFixed(4)
      }

      if (resp.type === 'lastblocks') {
        vm.lastblocks = resp.data;
        vm.currentdifficulties = [];
        for (var i = 0; i < vm.lastblocks.length; i++) {
          vm.currentdifficulties.push(vm.lastblocks[i].difficulty);
        }
        avghashrate();
      }
    };

    ws.onopen = function (event) {

    };

    var timeout = setInterval(function() {
      $scope.$apply();
    }, 300);

    function avghashrate() {
      var sum = vm.currentdifficulties.reduce(add, 0);

      function add(a, b) {
        return a + b;
      }
      vm.averagedifficulty = Math.round(sum / vm.currentdifficulties.length);
      vm.averagehashrate = vm.averagedifficulty / vm.blockTargetInterval;
      vm.averageblocktime = timeformat(vm.averagedifficulty / vm.averagehashrate);

    }

    function timeformat(seconds) {

  		var units = [
  			[60, 's.'],
  			[60, 'min.'],
  			[24, 'h.'],
  			[7, 'd.'],
  			[4, 'w.'],
  			[12, 'м.'],
  			[1, 'y.']
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

}])

AlloyEX.controller('minerCtrl', ['$scope', '$filter', '$interval', '$localStorage', '$rootScope', function($scope, $filter, $interval, $localStorage, $rootScope) {

}])

AlloyEX.controller('navbarCtrl', ['$localStorage', '$scope', 'ngDialog', '$rootScope', function($localStorage, $scope, ngDialog, $rootScope) {
  var self = this;


  self.isCollapsed = true;
  self.isLoggedIn = false;
  self.loggedIn = false;
  self.userName = '';
  self.config = {};

  if ($localStorage.userName) {
    self.userName = $localStorage.username;
  }

  $rootScope.$watch('config', function() {
    self.config = $rootScope.config;
  })

  self.saveToken = function(token) {
    $localStorage.jwtToken = token;
  }

  self.getToken = function(token) {
    return $localStorage.jwtToken;
  }

  self.isAuthed = function() {
    var self = this;
    var token = self.getToken();
    if (token) {
      return true;
    } else {
      return false;
    }
  }

  if (self.isAuthed()) {
    // console.log($localStorage);
    self.isLoggedIn = true;
    self.userName = $localStorage.username;
  }


  self.aboutmodal = function() {
    ngDialog.open({
      template: 'aboutModal',
      className: 'ngdialog-theme-plain',
      scope: $scope
    });
  }

  self.logout = function() {
    var self = this;
    $localStorage.$reset();
    self.loggedIn = false;
    self.isLoggedIn = false;
  }
}])

AlloyEX.controller('AdminCtrl', ['$rootScope', '$localStorage', '$sessionStorage', 'ngDialog', '$scope', function($rootScope, $localStorage, $sessionStorage, ngDialog, $scope) {

}]);

AlloyEX.controller('StatsCtrl', function($scope) {

});
