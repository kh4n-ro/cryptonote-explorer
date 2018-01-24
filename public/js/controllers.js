AlloyEX.controller('explorer_controller', ['$scope', '$filter', '$interval', 'api', function($scope, $filter, $interval, api) {
    var host = window.document.location.host.replace(/:.*/, '');
    var ws = new WebSocket('ws://' + host + ':3000');

    var vm = this;

    vm.mempool = [];
    vm.lastblocks = [];
    vm.charts = [];
    vm.averagehashrate = 0;
    vm.averagedifficulty = 0;
    vm.emission = 0;
    vm.activeheight = null;
    vm.nolastblocks = false;
    vm.laststats = {};
    vm.chartexists = false;

    /**
     * search blocks list
     */

     vm.loadpreviousblocks = function () {
       vm.nolastblocks = true;
       vm.activeheight = vm.lastblocks[0].height;
       var requestedheight = vm.activeheight - 30;
       api.getblockslist(requestedheight, function (response) {
         vm.lastblocks = response;
         vm.activeheight = vm.lastblocks[0].height;
       })
     }

     vm.loadnextblocks = function () {
       vm.nolastblocks = true;
       vm.activeheight = vm.lastblocks[0].height;
       var requestedheight = vm.activeheight + 30;
       api.getblockslist(requestedheight, function (response) {
         vm.lastblocks = response;
         vm.activeheight = vm.lastblocks[0].height;
         if (vm.laststats.bestheight - vm.activeheight <  30) {
           vm.nolastblocks = false;
         }
       })
     }

    /**
     * CHARTS
     */
    var diffchart;
    var txsizechart;
    var txcountchart;

     function initcharts() {
       // tx size chart

       var txsize_el = document.getElementById("txsizechart");
       var txsizechartdata = {
         labels: [].concat(vm.charts.timestamps).reverse(),
         datasets: [{
           data: [].concat(vm.charts.blocks).reverse(),
           yAxisID: "Height",
           label: "Height",
           backgroundColor: "rgba(0,0,0,0)",
           borderColor: 'rgba(0,0,0,0)',
           borderWidth: 0,
           pointBorderWidth: 0,
           pointRadius: 0,
           pointHoverRadius: 0,
           pointHitRadius: 0,
           display: false
         }, {
           data: [].concat(vm.charts.sizes).reverse(),
           yAxisID: "Sizes",
           label: "Size",
           backgroundColor: "rgba(48, 50, 59, 0)",
           borderColor: '#8BC34A',
           borderWidth: 1,
           pointColor: "#F44336",
           pointBorderColor: "#F44336",
           pointHighlightFill: "#F44336",
           pointBackgroundColor: "#F44336",
           pointBorderWidth: 2,
           pointRadius: 1,
           pointHoverRadius: 3,
           pointHitRadius: 20
         }]
       };

       var txsizeoptions = {
         responsive: true,
         maintainAspectRatio: false,
         elements: {
           line: {
             tension: 0
           }
         },
         title: {
           display: false
         },
         legend: {
           display: false
         },
         scales: {
           yAxes: [{
               id: 'Height',
               type: 'linear',
               position: 'right',
               scaleLabel: {
                 display: false,
                 labelString: 'Height'
               },
               gridLines: {
                 display: false
               },
               ticks: {
                 fontSize: 12,
                 display: false
               },
               display: false
             }, {
               id: 'Sizes',
               type: 'linear',
               position: 'right',
               scaleLabel: {
                 display: false,
                 labelString: 'Size'
               },
               gridLines: {
                 display: false
               },
               ticks: {
                 fontSize: 12,
                 display: false
               },
               display: false
             }

           ],
           xAxes: [{
             type: "time",
             time: {
               parser: false,
               unit: 'minute',
               unitStepSize: 60,
               round: 'second',
               displayFormats: {
                 'millisecond': 'SSS [ms]',
                 'second': 'HH:mm:ss', // 11:20:01 AM
                 'minute': 'HH:mm', // 11:20:01 AM
                 'hour': 'HH:mm', // Sept 4, 5PM
                 'day': 'MMM Do', // Sep 4 2015
                 'week': 'll', // Week 46, or maybe "[W]WW - YYYY" ?
                 'month': 'MMM YYYY', // Sept 2015
                 'quarter': '[Q]Q - YYYY', // Q3
                 'year': 'YYYY', // 2017
               },
             },
             gridLines: {
               display: false
             },
             ticks: {
               fontSize: 12,
               fontColor: "#efefef",
               autoSkip: true
             }
           }]
         },
         tooltips: {
           mode: 'index',
           callbacks: {
             title: function(tooltipItem, data) {
               var time = new Date(data.labels[tooltipItem[0].index]).toLocaleString();
               return time + '';
             },
           }
         }
       };

       txsizechart  = new Chart(txsize_el, {
         type: 'line',
         data: txsizechartdata,
         options: txsizeoptions
       });

       // tx count

       var txcount_el = document.getElementById("txcountchart");
       var txcountchartdata = {
         labels: [].concat(vm.charts.timestamps).reverse(),
         datasets: [{
           data: [].concat(vm.charts.blocks).reverse(),
           yAxisID: "Height",
           label: "Height",
           backgroundColor: "rgba(0,0,0,0)",
           borderColor: 'rgba(0,0,0,0)',
           borderWidth: 0,
           pointBorderWidth: 0,
           pointRadius: 0,
           pointHoverRadius: 0,
           pointHitRadius: 0,
           display: false
         }, {
           data: [].concat(vm.charts.txses).reverse(),
           yAxisID: "Transactions",
           label: "Transactions",
           backgroundColor: "rgba(48, 50, 59, 0)",
           borderColor: '#0288D1',
           borderWidth: 1,
           pointColor: "#F44336",
           pointBorderColor: "#F44336",
           pointHighlightFill: "#F44336",
           pointBackgroundColor: "#F44336",
           pointBorderWidth: 2,
           pointRadius: 1,
           pointHoverRadius: 3,
           pointHitRadius: 20
         }]
       };

       var txcountoptions = {
         responsive: true,
         maintainAspectRatio: false,
         elements: {
           line: {
             tension: 0
           }
         },
         title: {
           display: false
         },
         legend: {
           display: false
         },
         scales: {
           yAxes: [{
               id: 'Height',
               type: 'linear',
               position: 'right',
               scaleLabel: {
                 display: false,
                 labelString: 'Height'
               },
               gridLines: {
                 display: false
               },
               ticks: {
                 fontSize: 12,
                 display: false
               },
               display: false
             }, {
               id: 'Transactions',
               type: 'linear',
               position: 'right',
               scaleLabel: {
                 display: false,
                 labelString: 'Size'
               },
               gridLines: {
                 display: false
               },
               ticks: {
                 fontSize: 12,
                 display: false
               },
               display: false
             }

           ],
           xAxes: [{
             type: "time",
             time: {
               parser: false,
               unit: 'minute',
               unitStepSize: 60,
               round: 'second',
               displayFormats: {
                 'millisecond': 'SSS [ms]',
                 'second': 'HH:mm:ss', // 11:20:01 AM
                 'minute': 'HH:mm', // 11:20:01 AM
                 'hour': 'HH:mm', // Sept 4, 5PM
                 'day': 'MMM Do', // Sep 4 2015
                 'week': 'll', // Week 46, or maybe "[W]WW - YYYY" ?
                 'month': 'MMM YYYY', // Sept 2015
                 'quarter': '[Q]Q - YYYY', // Q3
                 'year': 'YYYY', // 2017
               },
             },
             gridLines: {
               display: false
             },
             ticks: {
               fontSize: 12,
               fontColor: "#efefef",
               autoSkip: true
             }
           }]
         },
         tooltips: {
           mode: 'index',
           callbacks: {
             title: function(tooltipItem, data) {
               var time = new Date(data.labels[tooltipItem[0].index]).toLocaleString();
               return time + '';
             },
           }
         }
       };

       txcountchart = new Chart(txcount_el, {
         type: 'bar',
         data: txcountchartdata,
         options: txcountoptions
       });

       // difficulty

       var chartdiff_el = document.getElementById("difficultychart");
       var diffchartdata = {
         labels: [].concat(vm.charts.timestamps).reverse(),
         datasets: [{
           data: [].concat(vm.charts.blocks).reverse(),
           yAxisID: "Height",
           label: "Height",
           backgroundColor: "rgba(0,0,0,0)",
           borderColor: 'rgba(0,0,0,0)',
           borderWidth: 0,
           pointBorderWidth: 0,
           pointRadius: 0,
           pointHoverRadius: 0,
           pointHitRadius: 0,
           display: false
         }, {
           data: [].concat(vm.charts.difficulties).reverse(),
           yAxisID: "Difficulty",
           label: "Difficulty",
           backgroundColor: "rgba(48, 50, 59, 0)",
           borderColor: 'rgba(48, 50, 59, 0)',
           borderWidth: 0,
           pointColor: "#F44336",
           pointBorderColor: "rgba(255, 255, 255, 0.7)",
           pointHighlightFill: "#FFF",
           pointBackgroundColor: "rgba(244, 67, 54, 0.2)",
           pointBorderWidth: 1,
           pointRadius: 3,
           pointHoverRadius: 2,
           pointHitRadius: 10
         }]
       };

       var diffoptions = {
         responsive: true,
         maintainAspectRatio: false,
         title: {
           display: false
         },
         legend: {
           display: false
         },
         elements: {
           line: {
             tension: 0
           }
         },
         scales: {
           yAxes: [{
               id: 'Height',
               position: 'left',
               scaleLabel: {
                 display: false,
                 labelString: 'Height'
               },
               gridLines: {
                 display: false
               },
               ticks: {
                 fontSize: 12,
                 display: false
               },
               display: false
             }, {
               id: 'Difficulty',
               position: 'left',
               scaleLabel: {
                 display: false,
                 labelString: 'Difficulty'
               },
               gridLines: {
                 display: false
               },
               ticks: {
                 fontSize: 12,
                 display: false,
                 autoSkip: true
               },
               display: false
             }],
           xAxes: [{
             type: "time",
             time: {
               parser: true,
               unit: 'minute',
               unitStepSize: 60,
               round: 'second',
               displayFormats: {
                 'millisecond': 'SSS [ms]',
                 'second': 'HH:mm:ss', // 11:20:01 AM
                 'minute': 'HH:mm', // 11:20:01 AM
                 'hour': 'HH:mm', // Sept 4, 5PM
                 'day': 'MMM Do', // Sep 4 2015
                 'week': 'll', // Week 46, or maybe "[W]WW - YYYY" ?
                 'month': 'MMM YYYY', // Sept 2015
                 'quarter': '[Q]Q - YYYY', // Q3
                 'year': 'YYYY', // 2017
               },
             },
             gridLines: {
               display: false
             },
             ticks: {
               fontSize: 12,
               fontColor: "#efefef",
               autoSkip: true
             }
           }]
         },
         tooltips: {
           mode: 'index',
           //displayColors: false,
           callbacks: {
             title: function(tooltipItem, data) {
               var height = data.datasets[0].data[tooltipItem[0].index];
               var time = new Date(data.labels[tooltipItem[0].index]).toLocaleString();
               return time + '';
             },
           }
         }
       };

       diffchart = new Chart(chartdiff_el, {
         type: 'line',
         data: diffchartdata,
         options: diffoptions
       });
     }

    // Socket listeners
    // ----------------

    ws.onmessage = function (event) {
      var resp = JSON.parse(event.data);

      if (resp === 'ping') {
        ws.send('pong');
      }

      if (resp.type === 'mempool') {
        vm.mempool = resp.data;
      }

      if (resp.type === 'laststats') {
        vm.laststats = resp.data;
      }

      if (resp.type === 'deepstats') {
        vm.deepstats = resp.data;
      }

      if (resp.type === 'lastblocks') {
        if (!vm.nolastblocks) {
          vm.lastblocks = resp.data;
          if (resp.data[0].height < vm.laststats.bestheight && !vm.refreshsent) {
            ws.send('refreshblocks');
            vm.refreshsent = true;
          }else {
            vm.refreshsent = false;
          }
        }

      }
      if (resp.type === 'deepcharts') {
        vm.charts = resp.data;
        if (diffchart && txcountchart && txsizechart) {
          diffchart.destroy();
          txcountchart.destroy();
          txsizechart.destroy();
        }
        
        initcharts();
      }
    };

    ws.onopen = function (event) {

    };

    var timeout = setInterval(function() {
      $scope.$apply();
    }, 300);

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
