AlloyEX.controller('home_controller', ['$scope', '$filter', '$interval', 'api','$rootScope', function($scope, $filter, $interval, api, $rootScope) {
    var vm = this;
    var host = window.document.location.host.replace(/:.*/, '')
    var socketUp = false;

    if (!$rootScope.ws) {
      $rootScope.ws = new WebSocket('ws://' + host + ':3000');
    }else {
      $rootScope.ws.send('alloyex-main');
    }

    vm.charts = [];
    vm.avgcharts = [];
    vm.laststats = {};
    vm.deepstats = {};
    vm.lastblocks = [];

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

       hashchart  = new Chart(hashchart_el, {
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

       avgtxsizechart  = new Chart(avgtxsizechart_el, {
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

      avgtxfeechart  = new Chart(avgtxfeechart_el, {
        type: 'line',
        data: avgtxfeechartdata,
        options: avgtxfeechartoptions
      });

     }



    // Socket listeners
    // ----------------

    $rootScope.ws.onmessage = function (event) {
      var resp = JSON.parse(event.data);

      if (resp === 'ping') {
        if (!socketUp) {
          socketUp = true;
          $rootScope.ws.send('alloyex-main');
        }
        $rootScope.ws.send('pong');
      }

      if (resp.type === 'laststats') {
        vm.laststats = resp.data;
      }

      if (resp.type === 'deepstats') {
        vm.deepstats = resp.data;
      }

      if (resp.type === 'lastblocks') {
        vm.lastblocks = resp.data;
      }

      if (resp.type === 'homecharts') {
        if (!vm.charts.blocks) {
          vm.charts = resp.data;
          initcharts();
        }else if (vm.charts.blocks[0] !== resp.data.blocks[0]) {
          diffchart.destroy();

          vm.charts = resp.data;
          initcharts();
        }
      }else if (resp.type === 'average_charts') {
        if (!vm.avgcharts.difficulties) {
          vm.avgcharts = resp.data;
          initavgcharts();
        }else if (vm.avgcharts.difficulties[0] !== resp.data.difficulties[0]) {
          hashchart.destroy();
          avgdiffchart.destroy();
          avgtxfeechart.destroy();
          avgtxsizechart.destroy();
          vm.avgcharts = resp.data;
          initavgcharts();
        }
      }

    };

    var timeout = setInterval(function() {
      $scope.$apply();
    }, 300);

}])

AlloyEX.controller('mempool_controller', ['$scope', '$filter', '$interval', 'api', '$rootScope', function($scope, $filter, $interval, api, $rootScope) {
  var vm = this;
  var host = window.document.location.host.replace(/:.*/, '')
  var socketUp = false;
  if (!$rootScope.ws) {
    $rootScope.ws = new WebSocket('ws://' + host + ':3000');
  }else {
    $rootScope.ws.send('alloyex-mempool');
  }

  vm.mempool = [];
  vm.laststats = {};
  vm.mempoolcharts = [];
  vm.avgcharts = [];

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


  // Socket listeners
  // ----------------

  $rootScope.ws.onmessage = function (event) {
    var resp = JSON.parse(event.data);

    if (resp === 'ping') {
      if (!socketUp) {
        socketUp = true;
        $rootScope.ws.send('alloyex-mempool');
      }
      $rootScope.ws.send('pong');
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

    if (resp.type === 'mempoolcharts') {
      if (!vm.mempoolcharts.blocks) {
        vm.mempoolcharts = resp.data;

        initcharts();
      }else if (vm.mempoolcharts.blocks[0] !== resp.data.blocks[0]) {
        txsizechart.destroy();

        vm.mempoolcharts = resp.data;
        initcharts();
      }

    }else if (resp.type === 'average_charts') {
      if (!vm.avgcharts.blocks) {
        vm.avgcharts = resp.data;
        initavgcharts();
      }else if (vm.mempool.blocks[0] !== resp.data.blocks[0]) {
        feechart.destroy();
        avgtxsizechart.destroy();

        hashchart.destroy();
        avgdiffchart.destroy();

        vm.avgcharts = resp.data;
        initavgcharts();
      }
    }
  };

  $rootScope.ws.onopen = function (event) {

  };

  var timeout = setInterval(function() {
    $scope.$apply();
  }, 300);

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
