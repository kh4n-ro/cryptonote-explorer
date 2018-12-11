CNExplorer.controller('menu_controller', ['$scope', 'ngDialog', '$rootScope','socket', function($scope, ngDialog, $rootScope, socket) {
  var self = this;

  self.menuOpen = function() {
    self.menuclicked = true;
  }

  $rootScope.laststats = {};
  $rootScope.mempool = [];
  $rootScope.lastblocks = [];
  $rootScope.deepstats = {};
  $rootScope.charts = {};
  $rootScope.mempoolcharts = {};
  $rootScope.avgcharts = {};
  $rootScope.pools = [];
  $rootScope.config = {};
  $rootScope.session_identifier = "";

  window.addEventListener("beforeunload", function(event) {
    socket.end();
  });

  socket.on('open', function open() {
    socket.write({ action: 'join', room: 'explorer' });
  })
  .on('end', function end() {
    console.log('Socket connection ended.')
  })
  .on('error', function error(err) {
    console.log(err);
  })
  .on('reconnecting', function reconnecting(opts) {
    console.log('We are scheduling a reconnect operation', opts);
  })
  .on('data', function incoming(data) {
    $scope.$apply(socketAction(data.action, data.data));
  });

  function socketAction(action, data) {
    data = xssFilter(data);

    switch (action) {
      case "client-message":
        console.log(data);
        break;

      case "lastblocks":
        $rootScope.lastblocks = data;
        break;

      case "laststats":
        $rootScope.laststats = data;
        break;

      case "deepstats":
        $rootScope.deepstats = data;
        break;

      case "remotes":
        $rootScope.remotes = data;
        break;

      case "mempool":
        $rootScope.mempool = data;
        break;

      case "homecharts":
        $rootScope.charts = data;
        break;

      case "mempoolcharts":
        $rootScope.mempoolcharts = data;
        break;

      case "average_charts":
        $rootScope.avgcharts = data;
        break;

      case "pools":
        $rootScope.pools = data;
        break;

      case "config":
        $rootScope.config = data;
        break;

    }

  }

  function xssFilter(obj) {
    if (_.isArray(obj)) {
      return _.map(obj, xssFilter);

    } else if (_.isObject(obj)) {
      return _.mapValues(obj, xssFilter);

    } else if (_.isString(obj)) {
      return obj.replace(/\< *\/* *script *>*/gi, '').replace(/javascript/gi, '');
    } else
      return obj;
  }

}]);

CNExplorer.controller('home_controller', ['$scope', '$filter', '$interval', 'api', '$rootScope', function($scope, $filter, $interval, api, $rootScope) {
  var vm = this;

  vm.charts = $rootScope.charts;
  vm.avgcharts = $rootScope.avgcharts;
  vm.laststats = $rootScope.laststats;
  vm.deepstats = $rootScope.deepstats;
  vm.lastblocks = $rootScope.lastblocks;
  vm.config = $rootScope.config;
  bind_data();

  $rootScope.$watch('laststats', function() {
    vm.laststats = $rootScope.laststats;
  })

  $rootScope.$watch('deepstats', function() {
    vm.deepstats = $rootScope.deepstats;
  })

  $rootScope.$watch('lastblocks', function() {
    vm.lastblocks = $rootScope.lastblocks;
  })

  $rootScope.$watch('config', function() {
    vm.config = $rootScope.config;
  })

  $rootScope.$watch('charts', function() {
    if (!vm.charts.blocks) {
      vm.charts = $rootScope.charts;
      initcharts();
    } else if (vm.charts.blocks[0] !== $rootScope.charts.blocks[0]) {
      vm.charts = $rootScope.charts;
      if (diffchart) diffchart.destroy();
      initcharts();
    }
  })

  $rootScope.$watch('avgcharts', function() {
    if (!vm.avgcharts.difficulties) {
      vm.avgcharts = $rootScope.avgcharts;
      initavgcharts();
    } else if (vm.avgcharts.difficulties[0] !== $rootScope.avgcharts.difficulties[0]) {
      vm.avgcharts = $rootScope.avgcharts;
      if (hashchart) hashchart.destroy();
      if (avgdiffchart) avgdiffchart.destroy();
      if (avgtxfeechart) avgtxfeechart.destroy();
      if (avgtxsizechart) avgtxsizechart.destroy();
      initavgcharts();
    }
  })


  function bind_data() {
    vm.charts = $rootScope.charts;
    vm.avgcharts = $rootScope.avgcharts;
    vm.laststats = $rootScope.laststats;
    vm.deepstats = $rootScope.deepstats;
    vm.lastblocks = $rootScope.lastblocks;
    vm.config = $rootScope.config;
  }

  initcharts();
  initavgcharts();

  /**
   * CHARTS
   */
  var diffchart;
  var avgtxsizechart;
  var avgtxfeechart;
  var avgdiffchart;
  var hashchart;

  function initcharts() {
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

  function initavgcharts() {
    var hashchart_el = document.getElementById("hashchart");
    var hashchartdata = {
      labels: [].concat(vm.avgcharts.timestamps).reverse(),
      datasets: [{
        data: [].concat(vm.avgcharts.hashrate).reverse(),
        yAxisID: "Hashrate",
        label: "Hashrate",
        backgroundColor: "rgba(48, 50, 59, 0)",
        borderColor: '#ffffff',
        borderWidth: 1,
        pointColor: "#ffffff",
        pointBorderColor: "#ffffff",
        pointHighlightFill: "#ffffff",
        pointBackgroundColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 1,
        pointHoverRadius: 3,
        pointHitRadius: 10
      }]
    };

    var hashchartoptions = {
      responsive: true,
      maintainAspectRatio: false,
      title: {
        display: false
      },
      legend: {
        display: false
      },
      scales: {
        yAxes: [{
            id: 'Hashrate',
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
          display: true,
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

    hashchart = new Chart(hashchart_el, {
      type: 'line',
      data: hashchartdata,
      options: hashchartoptions
    });

    var avgdiffchart_el = document.getElementById("avgdiffchart");
    var avgdiffchartdata = {
      labels: [].concat(vm.avgcharts.timestamps).reverse(),
      datasets: [{
        data: [].concat(vm.avgcharts.difficulties).reverse(),
        yAxisID: "Difficulty",
        label: "Difficulty",
        backgroundColor: "rgba(48, 50, 59, 0)",
        borderColor: '#F44336',
        borderWidth: 1,
        pointColor: "#F44336",
        pointBorderColor: "#F44336",
        pointHighlightFill: "#F44336",
        pointBackgroundColor: "#F44336",
        pointBorderWidth: 2,
        pointRadius: 1,
        pointHoverRadius: 3,
        pointHitRadius: 10
      }]
    };

    var avgdiffchartoptions = {
      responsive: true,
      maintainAspectRatio: false,
      title: {
        display: false
      },
      legend: {
        display: false
      },
      scales: {
        yAxes: [{
            id: 'Difficulty',
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
          display: true,
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

    avgdiffchart = new Chart(avgdiffchart_el, {
      type: 'line',
      data: avgdiffchartdata,
      options: avgdiffchartoptions
    });

    var avgtxsizechart_el = document.getElementById("avgtxsizechart");
    var avgtxsizechartdata = {
      labels: [].concat(vm.avgcharts.timestamps).reverse(),
      datasets: [{
        data: [].concat(vm.avgcharts.sizes).reverse(),
        yAxisID: "TxSize",
        label: "Tx Size",
        backgroundColor: "rgba(48, 50, 59, 0)",
        borderColor: '#F44336',
        borderWidth: 1,
        pointColor: "#F44336",
        pointBorderColor: "#F44336",
        pointHighlightFill: "#F44336",
        pointBackgroundColor: "#F44336",
        pointBorderWidth: 2,
        pointRadius: 1,
        pointHoverRadius: 3,
        pointHitRadius: 10
      }]
    };

    var avgtxsizechartoptions = {
      responsive: true,
      maintainAspectRatio: false,
      title: {
        display: false
      },
      legend: {
        display: false
      },
      scales: {
        yAxes: [{
            id: 'TxSize',
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
          display: false,
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

    avgtxsizechart = new Chart(avgtxsizechart_el, {
      type: 'line',
      data: avgtxsizechartdata,
      options: avgtxsizechartoptions
    });


    var avgtxfeechart_el = document.getElementById("avgtxfeechart");
    var avgtxfeechartdata = {
      labels: [].concat(vm.avgcharts.timestamps).reverse(),
      datasets: [{
        data: [].concat(vm.avgcharts.fees).reverse(),
        yAxisID: "txfee",
        label: "Tx Fee",
        backgroundColor: "rgba(48, 50, 59, 0)",
        borderColor: '#F44336',
        borderWidth: 1,
        pointColor: "#F44336",
        pointBorderColor: "#F44336",
        pointHighlightFill: "#F44336",
        pointBackgroundColor: "#F44336",
        pointBorderWidth: 2,
        pointRadius: 1,
        pointHoverRadius: 3,
        pointHitRadius: 10
      }]
    };

    var avgtxfeechartoptions = {
      responsive: true,
      maintainAspectRatio: false,
      title: {
        display: false
      },
      legend: {
        display: false
      },
      scales: {
        yAxes: [{
            id: 'txfee',
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
          display: false,
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

    avgtxfeechart = new Chart(avgtxfeechart_el, {
      type: 'line',
      data: avgtxfeechartdata,
      options: avgtxfeechartoptions
    });

  }

}])

CNExplorer.controller('mempool_controller', ['$scope', '$filter', '$interval', 'api', '$rootScope', function($scope, $filter, $interval, api, $rootScope) {
  var vm = this;

  vm.avgcharts = $rootScope.avgcharts;
  vm.laststats = $rootScope.laststats;
  vm.deepstats = $rootScope.deepstats;
  vm.mempoolcharts = $rootScope.mempoolcharts;
  vm.lastblocks = $rootScope.lastblocks;
  vm.mempool = $rootScope.mempool;
  vm.config = $rootScope.config;

  bind_data();

  $rootScope.$watch('laststats', function() {
    vm.laststats = $rootScope.laststats;
  })

  $rootScope.$watch('mempool', function() {
    vm.mempool = $rootScope.mempool;
  })

  $rootScope.$watch('deepstats', function() {
    vm.deepstats = $rootScope.deepstats;
  })

  $rootScope.$watch('lastblocks', function() {
    vm.lastblocks = $rootScope.lastblocks;
  })

  $rootScope.$watch('config', function() {
    vm.config = $rootScope.config;
  })

  $rootScope.$watch('avgcharts', function() {
    if (!vm.avgcharts.difficulties && $rootScope.avgcharts) {
      vm.avgcharts = $rootScope.avgcharts;
      initavgcharts();
    }else if ($rootScope.avgcharts && vm.avgcharts.difficulties[0] !== $rootScope.avgcharts.difficulties[0]) {
      vm.avgcharts = $rootScope.avgcharts;

      if (hashchart) {
        hashchart.destroy();
      }
      if (feechart) {
        feechart.destroy();
      }
      if (avgdiffchart) {
        avgdiffchart.destroy();
      }
      if (avgtxsizechart) {
        avgtxsizechart.destroy();
      }

      initavgcharts();
    }
  })

  $rootScope.$watch('mempoolcharts', function() {
    if (!vm.mempoolcharts.blocks && $rootScope.mempoolcharts.blocks[0]) {
      vm.mempoolcharts = $rootScope.mempoolcharts;
      initcharts();
    }else if (vm.mempoolcharts.blocks && vm.mempoolcharts.blocks[0] !== $rootScope.mempoolcharts.blocks[0]) {
      if (txsizechart) {
        txsizechart.destroy();
      }
      vm.mempoolcharts = $rootScope.mempoolcharts;
      initcharts();
    }
  })

  function bind_data() {
    vm.avgcharts = $rootScope.avgcharts;
    vm.laststats = $rootScope.laststats;
    vm.deepstats = $rootScope.deepstats;
    vm.mempoolcharts = $rootScope.mempoolcharts;
    vm.lastblocks = $rootScope.lastblocks;
    vm.mempool = $rootScope.mempool;
    vm.config = $rootScope.config;
  }

  initcharts();
  initavgcharts();

  /**
   * CHARTS
   */
  var feechart;
  var hashchart;
  var txsizechart;
  var txcountchart;
  var avgtxsizechart;
  var avgdiffchart;

   function initcharts() {
     // difficulty
     var charttxsize_el = document.getElementById("txsizechart");
     var txsizechartdata = {
       labels: [].concat(vm.mempoolcharts.timestamps).reverse(),
       datasets: [{
         data: [].concat(vm.mempoolcharts.blocks).reverse(),
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
         data: [].concat(vm.mempoolcharts.sizes).reverse(),
         yAxisID: "TxSize",
         label: "Tx Size",
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

     var txsizeoptions = {
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
             id: 'TxSize',
             position: 'left',
             scaleLabel: {
               display: false,
               labelString: 'TxSize'
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

     txsizechart = new Chart(charttxsize_el, {
       type: 'line',
       data: txsizechartdata,
       options: txsizeoptions
     });
   }

   function initavgcharts() {
     var hashchart_el = document.getElementById("hashchart");
     var hashchartdata = {
       labels: [].concat(vm.avgcharts.timestamps).reverse(),
       datasets: [{
         data: [].concat(vm.avgcharts.hashrate).reverse(),
         yAxisID: "Hashrate",
         label: "Hashrate",
         backgroundColor: "rgba(48, 50, 59, 0)",
         borderColor: '#ffffff',
         borderWidth: 1,
         pointColor: "#ffffff",
         pointBorderColor: "#ffffff",
         pointHighlightFill: "#ffffff",
         pointBackgroundColor: "#ffffff",
         pointBorderWidth: 2,
         pointRadius: 1,
         pointHoverRadius: 3,
         pointHitRadius: 10
       }]
     };

     var hashchartoptions = {
       responsive: true,
       maintainAspectRatio: false,
       title: {
         display: false
       },
       legend: {
         display: false
       },
       scales: {
         yAxes: [{
             id: 'Hashrate',
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
           display: false,
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

     hashchart  = new Chart(hashchart_el, {
       type: 'line',
       data: hashchartdata,
       options: hashchartoptions
     });

     var feechart_el = document.getElementById("feechart");
     var feechartdata = {
       labels: [].concat(vm.avgcharts.timestamps).reverse(),
       datasets: [{
         data: [].concat(vm.avgcharts.fees).reverse(),
         yAxisID: "Hashrate",
         label: "Hashrate",
         backgroundColor: "rgba(48, 50, 59, 0)",
         borderColor: '#ffffff',
         borderWidth: 1,
         pointColor: "#ffffff",
         pointBorderColor: "#ffffff",
         pointHighlightFill: "#ffffff",
         pointBackgroundColor: "#ffffff",
         pointBorderWidth: 2,
         pointRadius: 1,
         pointHoverRadius: 3,
         pointHitRadius: 10
       }]
     };

     var feechartoptions = {
       responsive: true,
       maintainAspectRatio: false,
       title: {
         display: false
       },
       legend: {
         display: false
       },
       scales: {
         yAxes: [{
             id: 'Hashrate',
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

     feechart  = new Chart(feechart_el, {
       type: 'line',
       data: feechartdata,
       options: feechartoptions
     });

     var avgdiffchart_el = document.getElementById("avgdiffchart");
     var avgdiffchartdata = {
       labels: [].concat(vm.avgcharts.timestamps).reverse(),
       datasets: [{
         data: [].concat(vm.avgcharts.difficulties).reverse(),
         yAxisID: "Difficulty",
         label: "Difficulty",
         backgroundColor: "rgba(48, 50, 59, 0)",
         borderColor: '#F44336',
         borderWidth: 1,
         pointColor: "#F44336",
         pointBorderColor: "#F44336",
         pointHighlightFill: "#F44336",
         pointBackgroundColor: "#F44336",
         pointBorderWidth: 2,
         pointRadius: 1,
         pointHoverRadius: 3,
         pointHitRadius: 10
       }]
     };

     var avgdiffchartoptions = {
       responsive: true,
       maintainAspectRatio: false,
       title: {
         display: false
       },
       legend: {
         display: false
       },
       scales: {
         yAxes: [{
             id: 'Difficulty',
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
           display: false,
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

     avgdiffchart  = new Chart(avgdiffchart_el, {
       type: 'line',
       data: avgdiffchartdata,
       options: avgdiffchartoptions
     });

     var avgtxsizechart_el = document.getElementById("avgtxsizechart");
     var avgtxsizechartdata = {
       labels: [].concat(vm.avgcharts.timestamps).reverse(),
       datasets: [{
         data: [].concat(vm.avgcharts.sizes).reverse(),
         yAxisID: "TxSize",
         label: "Tx Size",
         backgroundColor: "rgba(48, 50, 59, 0)",
         borderColor: '#F44336',
         borderWidth: 1,
         pointColor: "#F44336",
         pointBorderColor: "#F44336",
         pointHighlightFill: "#F44336",
         pointBackgroundColor: "#F44336",
         pointBorderWidth: 2,
         pointRadius: 1,
         pointHoverRadius: 3,
         pointHitRadius: 10
       }]
     };

     var avgtxsizechartoptions = {
       responsive: true,
       maintainAspectRatio: false,
       title: {
         display: false
       },
       legend: {
         display: false
       },
       scales: {
         yAxes: [{
             id: 'TxSize',
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

     avgtxsizechart  = new Chart(avgtxsizechart_el, {
       type: 'line',
       data: avgtxsizechartdata,
       options: avgtxsizechartoptions
     });

   }
}])

CNExplorer.controller('search_controller', ['$scope', 'ngDialog', '$rootScope','api', function($scope, ngDialog, $rootScope, api) {
  var self = this;
  self.searchclicked = false;
  self.mempool = $rootScope.mempool;

  self.search = function() {
    self.searchclicked = !self.searchclicked;
  }

  self.searchresults = {};

  self.searchFieldChange = function () {
    if (self.searchvalue.length > 0) {
      if ( self.searchvalue.length < 64 ) {
          // search by height
          api.getblock(self.searchvalue, function (resp) {
            if (resp === '"KO"') {
              console.log('block not found/valid');
            }else {
              // console.log('Block:', resp);
              self.searchresults = {
                type: 'valid block',
                data: resp
              };
            }
          })
      }else if ( self.searchvalue.length == 64 ) {
        // search block
        api.getblock(self.searchvalue, function (resp) {
          if (resp === '"KO"') {
            // try tx
            api.gettx(self.searchvalue, function (r) {
              if (r === '"KO"') {
                // last try mempool
                for (var i = 0; i < $rootScope.mempool.length; i++) {
                  if (self.searchvalue === $rootScope.mempool[i].hash) {
                    self.searchresults = {
                      type: 'transaction in mempool',
                      data: $rootScope.mempool[i]
                    };
                  }
                }
              }else {
                self.searchresults = {
                  type: 'valid transaction',
                  data: r
                };
              }
            })
          }else {
            self.searchresults = {
              type: 'valid block',
              data: resp
            };
          }
        })
      } else {
          console.log('wrong search!');
      }
    }
  }
}])

CNExplorer.controller('block_controller', ['$rootScope', 'ngDialog', '$scope', '$routeParams', 'api', function($rootScope, ngDialog, $scope, $routeParams, api) {
  var vm = this;

  api.getblock($routeParams.blockhash, function (res) {
      vm.block = res;
  });

}]);

CNExplorer.controller('transaction_controller', ['$rootScope', 'ngDialog', '$scope', '$routeParams', 'api', function($rootScope, ngDialog, $scope, $routeParams, api) {
  var vm = this;

  api.gettx($routeParams.txhash, function (res) {
      vm.transaction = res;
  });

  vm.laststats = $rootScope.laststats;
  vm.deepstats = $rootScope.deepstats;

}]);

CNExplorer.controller('paymentid_controller', ['$rootScope', 'ngDialog', '$scope', function($rootScope, ngDialog, $scope) {
  var self = this;


}]);

CNExplorer.controller('remotes_controller', ['$rootScope', 'ngDialog', '$scope', '$http', function($rootScope, ngDialog, $scope, $http) {
  var vm = this;
  vm.remotes = [];

  $rootScope.$watch('remotes', function() {
    vm.remotes = $rootScope.remotes;
  })

  vm.gui_instructions = function() {
    ngDialog.open({
      template: 'gui_instructionsModal',
      className: 'ngdialog-theme-plain larger',
      scope: $scope
    });
  }

  vm.terminal_instructions = function() {
    ngDialog.open({
      template: 'terminal_instructionsModal',
      className: 'ngdialog-theme-plain',
      scope: $scope
    });
  }
}]);

CNExplorer.controller('pools_controller', ['$rootScope', 'ngDialog', '$scope', '$http', '$interval', '$timeout', function($rootScope, ngDialog, $scope, $http, $interval, $timeout) {
  var vm = this;
  var dominancePool = '';
  var coinUnits = 1000000000000;

  vm.pools = $rootScope.pools;
  vm.deepstats = $rootScope.deepstats;
  vm.laststats = $rootScope.laststats;
  vm.poolshashrates = [];
  vm.poolsnames = [];
  vm.poolscolors = [];
  vm.poolsminers = [];
  vm.config = {};
  vm.minerhashrate = 1;
  vm.minerprofit = 0;
  vm.hashmultiplier = 1;
  vm.hashmultipliers = ['H/s','KH/s','MH/s'];

  $rootScope.$on('pool-latency', function(event, pool) {
    for (var i = 0; i < vm.pools.length; i++) {
      if (vm.pools[i]._id === pool._id) {
        vm.pools[i] = pool;
      }
    }
  });

  function poolSlatency() {
    if (vm.pools.length > 0) {
      angular.forEach(vm.pools, function (pool) {
        if (pool.height <= vm.laststats.lastblockheight && pool.height > vm.laststats.lastblockheight - 3) {
          if (pool.rootapi.split(':')[0] === 'https' ) {
            var request = $http.get(pool.rootapi).then(function(response) {
                var time = response.config.responseTimestamp - response.config.requestTimestamp;
                return time;
            });
            request.then(function (data) {
              pool.latency = data;
              $rootScope.$broadcast('pool-latency', pool);
            });
          }
        }
      })
    }
  }

  vm.selectMultiplier = function (multiplier) {
    vm.hashmultiplier = multiplier;
    calculate_coin_earnings();
  }

  $scope.$watch('minerhashrate', function (value) {
    vm.minerhashrate = value;
    calculate_coin_earnings();
  });

  function calculate_coin_earnings() {
    vm.minerprofit = (vm.minerhashrate * Math.pow(1024,vm.hashmultiplier) * 86400 / vm.laststats.difficulty) * vm.laststats.reward;
  }

  $scope.$on('$routeChangeSuccess', function () {
    initMap();
  });

  bind_data();

  vm.miningdevices = [{
    name : 'Intel i7-3770',
    hashrate : 150
  },{
    name : 'AMD RX550 2GB',
    hashrate : 220
  },{
    name : 'AMD RX550 4GB',
    hashrate : 220
  },{
    name : 'AMD RX480 4GB',
    hashrate : 400
  },{
    name : 'AMD RX480 8GB',
    hashrate : 460
  },{
    name : 'AMD RX580 4GB',
    hashrate : 510
  },{
    name : 'AMD VEGA 56/64',
    hashrate : 1020
  }];

  vm.miningsoftware = [{
    name : 'XMR-Stak-Alloy',
    url : 'https://github.com/alloyproject/xmr-stak-alloy/releases'
  },{
    name : 'SRBMiner',
    url : 'https://bitcointalk.org/index.php?topic=3167363.0'
  },{
    name : 'XMRig NVIDIA',
    url : 'https://github.com/alloyproject/xmrig-nvidia/releases'
  }];

  $rootScope.$watch('pools', function() {
    vm.pools = $rootScope.pools;
    vm.poolshashrates = [];
    vm.poolsnames = [];
    vm.poolscolors = [];
    vm.poolsminers = [];
    if (vm.pools.length > 0) {
      for (var i = 0; i < vm.pools.length; i++) {
        vm.poolshashrates.push(vm.pools[i].hashrate);
        vm.poolsnames.push(vm.pools[i].link);
        vm.poolscolors.push(vm.pools[i].color);
        vm.poolsminers.push(vm.pools[i].activeminers);
      }
    }

    if (vm.poolsHashrateChart) {
      vm.poolsHashrateChart.destroy();
      initPoolsHashrateChart();
    }else {
      initPoolsHashrateChart();
    }

    if (vm.poolsMinersChart) {
      vm.poolsMinersChart.destroy();
      initPoolsMinersChart();
    }else {
      initPoolsMinersChart();
    }

    $timeout(poolSlatency, 5000);

  })

  $rootScope.$watch('laststats', function() {
    vm.laststats = $rootScope.laststats;
  })

  $rootScope.$watch('deepstats', function() {
    vm.deepstats = $rootScope.deepstats;
  })

  $rootScope.$watch('config', function() {
    vm.config = $rootScope.config;
  })

  function bind_data() {
    vm.pools = $rootScope.pools;
    vm.deepstats = $rootScope.deepstats;
    vm.laststats = $rootScope.laststats;
    vm.config = $rootScope.config;
  }

  function initPoolsHashrateChart() {
    var ctx = document.getElementById("poolshashratechart");

    var chartData = {
      labels: vm.poolsnames,
      datasets: [{
        data: vm.poolshashrates,
        backgroundColor: vm.poolscolors,
        borderWidth: 1,
        segmentShowStroke: false
      }]
    };
    var options = {
      title: {
        display: true,
        text: 'Hashrate Distribution',
        fontSize: 18,
        fontColor: "#efefef"
      },
      legend: {
        display: false,
        labels: {
          fontColor: '#efefef'
        }
      },
      tooltips: {
        enabled: true,
        mode: 'single',
        callbacks: {
          title: function(tooltipItem, data) {
            var total = vm.deepstats.instanths;
            var individual = data.datasets[0].data[tooltipItem[0].index];
            if (eval(data.datasets[0].data.join("+")) > vm.deepstats.instanths) {
              // known pools bigger then network hashrate
              if (vm.config.hidedominantpools && individual * 100 / eval(data.datasets[0].data.join("+")) > vm.config.dominancepercent) {
                dominancePool = data.labels[tooltipItem[0].index];
                return 'Hidden due to hashrate dominance';
              } else {
                return data.labels[tooltipItem[0].index];
              }
            } else {
              // known pools smaller then network hashrate
              if (vm.config.hidedominantpools && individual * 100 / (vm.deepstats.instanths) > vm.config.dominancepercent) {
                dominancePool = data.labels[tooltipItem[0].index];
                return 'Hidden due to hashrate dominance';
              } else {
                return data.labels[tooltipItem[0].index];
              }
            }
          },
          label: function(tooltipItem, data) {
            var amount = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
            if (eval(data.datasets[0].data.join("+")) > vm.deepstats.instanths) {
              // known pools bigger then network hashrate
              var total = eval(data.datasets[0].data.join("+"));
            } else {
              var total = vm.deepstats.instanths;
            }
            return amount + ' / ' + parseFloat(total).toFixed(2) + ' H/s  (' + parseFloat(amount * 100 / (total)).toFixed(2) + '%)';
          }
        }
      }
    };

    vm.poolsHashrateChart = new Chart(ctx, {
      type: 'doughnut',
      data: chartData,
      options: options
    });
  }

  function initPoolsMinersChart() {
    var ctx2 = document.getElementById("poolsminerchart");

    var chartData2 = {
      labels: vm.poolsnames,
      datasets: [{
        data: vm.poolsminers,
        backgroundColor: vm.poolscolors,
        borderWidth: 1,
        segmentShowStroke: false
      }]
    };
    var options2 = {
      title: {
        display: true,
        text: 'Miner Distribution',
        fontSize: 18,
        fontColor: "#efefef"
      },
      legend: {
        display: false,
        labels: {
          fontColor: '#efefef'
        }
      },
      tooltips: {
        enabled: true,
        mode: 'single',
        callbacks: {
          title: function(tooltipItem, data) {
            var total = eval(data.datasets[0].data.join("+"));
            var individual = data.datasets[0].data[tooltipItem[0].index];
            if (data.labels[tooltipItem[0].index] === dominancePool) {
              return 'Hidden due to hashrate dominance';
            } else {
              return data.labels[tooltipItem[0].index];
            }
          },
          label: function(tooltipItem, data) {
            var amount = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
            var total = eval(data.datasets[tooltipItem.datasetIndex].data.join("+"));
            return amount + ' / ' + total + ' miners  (' + parseFloat(amount * 100 / total).toFixed(2) + '%)';
          }
        }
      }
    };

    vm.poolsMinersChart = new Chart(ctx2, {
      type: 'doughnut',
      data: chartData2,
      options: options2
    });
  }

  function initMap() {
    if(document.getElementById('map')) {
      var locations = [
        ['cryptoknight.cc/alloy', 45.2993, 9.491, 3, 'http://cryptoknight.cc/alloy/', 'EU - Germany', true, 'seb green#4328',true, ['support','EN/DE'], ['','']],
        ['xao.almsoft.net', 46, 25, 5, 'http://pool.almsoft.net/', 'EU - Romania', true, 'alex.mateescu#1700',true, ['support','EN/RO'], ['','']],
        ['xao.euminingpool.com', 40.31, 13.25, 6, 'http://xao.euminingpool.com/', 'EU - Germany', true, 'biteth2017#9580',true, ['support','EN/IT'], ['','']],
        ['alloypool.com', 39.0481, -77.4729, 8, 'https://alloypool.com/', 'US - Virginia', true, 'nighthawk#3808'],
        ['newpool.pw', 45.7386, 37.6068, 12, 'http://newpool.pw/', 'Russia', false, 'sanich#1050', true, ['support','RU'], ['lottery','Win 220 XAO!']],
        ['alloy.cryptonight.me', 1.2855, 103.8565, 9, 'http://alloy.cryptonight.me/', 'Asia - Singapore', true, 'sai#2032',true, ['support','EN/CN'], ['','']],
        ['alloy.cryptonight.me', 45.8696, -119.688, 10, 'http://alloy.cryptonight.me/', 'US - Oregon', false, 'sai#2032',true, ['support','EN/CN'], ['','']],
        ['xao.mine2gether.com', 51.2993, 9.491, 11, 'http://xao.mine2gether.com/', 'EU - Germany', true, 'DiscoTim#3647'],
        ['xao.corpopool.com', 52.2394, 21.0362, 14, 'http://xao.corpopool.com/', 'EU - Poland', true, 'AnotherYou#9750'],
        ['xao.gizmo-pool.eu', 46.1512, 14.9955, 15, 'http://xao.gizmo-pool.eu/', 'EU - Slovenia', true, 'leoirssi gizmo-pool.eu#4099'],
        ['xao.jbarbieri.net', 41.291, -82.2277, 16, 'http://xao.jbarbieri.net/', 'US - EAST (Ohio)', true, 'jbarbieri#4396',true, ['support','EN'], ['','']],
        ['youpool.io/XAO', 30.2936, 120.1614, 17, 'http://youpool.io/XAO', 'CN - Hangzhou', true, 'youpool.io#7823',true, ['support','EN/CN'], ['','']]
      ];

      var map = new google.maps.Map(document.getElementById('map'), {
        zoom: 2,
        center: new google.maps.LatLng(35, -5),
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: true,
        draggable: true,
        styles: [{
          elementType: 'geometry',
          stylers: [{
            color: '#242f3e'
          }]
        },
        {
          elementType: 'labels.text.stroke',
          stylers: [{
            color: '#242f3e'
          }]
        },
        {
          elementType: 'labels.text.fill',
          stylers: [{
            color: '#746855'
          }]
        },
        {
          featureType: 'administrative.locality',
          elementType: 'labels.text.fill',
          stylers: [{
            color: '#d59563'
          }]
        },
        {
          featureType: 'poi',
          elementType: 'labels.text.fill',
          stylers: [{
            color: '#d59563'
          }]
        },
        {
          featureType: 'poi.park',
          elementType: 'geometry',
          stylers: [{
            color: '#263c3f'
          }]
        },
        {
          featureType: 'poi.park',
          elementType: 'labels.text.fill',
          stylers: [{
            color: '#6b9a76'
          }]
        },
        {
          featureType: 'road',
          elementType: 'geometry',
          stylers: [{
            color: '#38414e'
          }]
        },
        {
          featureType: 'road',
          elementType: 'geometry.stroke',
          stylers: [{
            color: '#212a37'
          }]
        },
        {
          featureType: 'road',
          elementType: 'labels.text.fill',
          stylers: [{
            color: '#9ca5b3'
          }]
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry',
          stylers: [{
            color: '#746855'
          }]
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry.stroke',
          stylers: [{
            color: '#1f2835'
          }]
        },
        {
          featureType: 'road.highway',
          elementType: 'labels.text.fill',
          stylers: [{
            color: '#f3d19c'
          }]
        },
        {
          featureType: 'transit',
          elementType: 'geometry',
          stylers: [{
            color: '#2f3948'
          }]
        },
        {
          featureType: 'transit.station',
          elementType: 'labels.text.fill',
          stylers: [{
            color: '#d59563'
          }]
        },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{
            color: '#17263c'
          }]
        },
        {
          featureType: 'water',
          elementType: 'labels.text.fill',
          stylers: [{
            color: '#515c6d'
          }]
        },
        {
          featureType: 'water',
          elementType: 'labels.text.stroke',
          stylers: [{
            color: '#17263c'
          }]
        }
      ]
    });

    var infowindow = new google.maps.InfoWindow();

    var marker, i;

    for (i = 0; i < locations.length; i++) {
      marker = new google.maps.Marker({
        position: new google.maps.LatLng(locations[i][1], locations[i][2]),
        icon: '/images/alloypin.png',
        url: locations[i][4],
        title: locations[i][0],
        map: map
      });

      google.maps.event.addListener(marker, 'click', (function(marker, i) {
        return function() {
          var hasSpecials = locations[i][8];
          var feature_1 = locations[i][9];
          var feature_2 = locations[i][10];
          if (hasSpecials) {
            var infocontent = '<div class="row" style="width: 200px;">' +
            '<div class="col-xs-12"><span class="pull-left">name </span><span class="pull-right"><a class="" href="' + locations[i][4] + '" target="_blank">' + locations[i][0] + '</a></span></div>' +
            '<div class="col-xs-12"><span class="pull-left">location </span><span class="pull-right">' + locations[i][5] + '</span></div>' +
            '<div class="col-xs-12"><span class="pull-left">owner </span><span class="pull-right">' + locations[i][7] + '</span></div>' +
            '<div class="col-xs-12"><span class="specials pull-left">specials </span></div>' +
            '<div class="col-xs-12"><span class="pull-left">'+ feature_1[0] +'</span><span class="pull-right">' + feature_1[1] + '</span></div>' +
            '<div class="col-xs-12"><span class="pull-left">'+ feature_2[0] +'</span><span class="pull-right">' + feature_2[1] + '</span></div>' +
            '</div>';
          }else {
            var infocontent = '<div class="row" style="width: 200px;">' +
            '<div class="col-xs-12"><span class="pull-left">name </span><span class="pull-right"><a class="" href="' + locations[i][4] + '" target="_blank">' + locations[i][0] + '</a></span></div>' +
            '<div class="col-xs-12"><span class="pull-left">location </span><span class="pull-right">' + locations[i][5] + '</span></div>' +
            '<div class="col-xs-12"><span class="pull-left">owner </span><span class="pull-right">' + locations[i][7] + '</span></div>' +
            '</div>';
          }

          infowindow.setContent(infocontent);
          infowindow.open(map, marker);
        }
      })(marker, i));

    }
    }
  }

  $('#calcHashRate').keyup(calcEstimateProfit).change(calcEstimateProfit);

  $('#calcHashUnits > li > a').click(function(e) {
    e.preventDefault();
    $('#calcHashUnit').text($(this).text()).data('mul', $(this).data('mul'));
    calcEstimateProfit();
  });


  function calcEstimateProfit() {
    try {
      var rateUnit = Math.pow(1024, parseInt($('#calcHashUnit').data('mul')));
      var hashRate = parseFloat($('#calcHashRate').val()) * rateUnit;
      var profit = (hashRate * 86400 / lastStats.difficulty) * vm.laststats.reward;
      if (profit) {
        updateText('calcHashAmount', getReadableCoins(profit, 2, true));
        return;
      }
    } catch (e) {}
    updateText('calcHashAmount', '');
  }

  function updateText(elementId, text){
      var el = document.getElementById(elementId);
      if (el) {
        if (el.textContent !== text){
            el.textContent = text;
        }
        return el;
      }
      return null;
  }

  function getReadableCoins(coins, digits, withoutSymbol){
    var amount = (parseInt(coins || 0) / coinUnits).toFixed(digits || coinUnits.toString().length - 1);
    return amount + (withoutSymbol ? '' : (' ' + symbol));
  }

}]);

CNExplorer.controller('paperwallet_controller', ['$rootScope', '$scope', function($rootScope, $scope) {
  var vm = this;
  var walletgenerated = false;
  $rootScope.$watch('config', function() {
    vm.config = $rootScope.config;
    $scope.paper_wallet_config = vm.config.paper_wallet_config;
    if (!walletgenerated && $scope.paper_wallet_config) {
      vm.genwallet(null);
      walletgenerated = true;
    }
  })

  vm.walletRestore = function() {
    document.getElementById("restorewallet").setAttribute("style", "display:block");
    document.getElementById("createwallet").setAttribute("style", "display:none");
    document.getElementById("restorebutton").setAttribute("style", "display:none");
    document.getElementById("createbutton").setAttribute("style", "display:block");
  }

  vm.walletCreate = function() {
    document.getElementById("restorewallet").setAttribute("style", "display:none");
    document.getElementById("createwallet").setAttribute("style", "display:block");
    document.getElementById("restorebutton").setAttribute("style", "display:block");
    document.getElementById("createbutton").setAttribute("style", "display:none");
  }

  vm.genwallet = function (value) {
    genwallet(value, $scope.paper_wallet_config);
  }

  vm.checkrestoreseed = function () {
    checkrestoreseed(angular.element(document.getElementById('restore_widget'))[0].value, $scope.paper_wallet_config);
    vm.walletCreate();
  }

  vm.checkEntropy = function () {
    checkEntropy();
  }

  vm.check_prefix_validity = function () {
    check_prefix_validity();
  }

  vm.genwallet_prefix = function () {
    genwallet_prefix();
  }

  vm.walletCreate();

}]);

CNExplorer.controller('admin_ctrl', ['$rootScope', 'ngDialog', '$scope', function($rootScope, ngDialog, $scope) {

}]);
