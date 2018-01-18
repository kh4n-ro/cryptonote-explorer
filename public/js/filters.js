
/* Filters */
angular.module('AlloyEX.filters', [])
.filter('numeral', function() {
    return function(input) {
      return parseFloat(input).toFixed(8);
    };
})
.filter('toArray', function() {
    return function(obj) {
      const result = [];
      angular.forEach(obj, function(val) {
        result.push(val);
      });
     return result;
   }
 })

.filter('timeagofilter', function() {
	return function(timestamp) {
    if(typeof timestamp === 'undefined')
			return '∞';

    var time = Math.floor((new Date).getTime()/1000);

    var startTime =  Math.round(new Date(timestamp).getTime()/1000);
    var timeInterval = Math.round((time - startTime));

		return  moment.duration(timeInterval, 's').humanize()  + ' ago';
	};
})


.filter('totalDifficultyFilter', function() {
	return function(hashes) {
		var result = 0;
		var unit = '';

		if(hashes !== 0 && hashes < 1000) {
			result = hashes;
			unit = '';
		}

		if(hashes >= 1000 && hashes < Math.pow(1000, 2)) {
			result = hashes / 1000;
			unit = 'K';
		}

		if(hashes >= Math.pow(1000, 2) && hashes < Math.pow(1000, 3)) {
			result = hashes / Math.pow(1000, 2);
			unit = 'M';
		}

		if(hashes >= Math.pow(1000, 3) && hashes < Math.pow(1000, 4)) {
			result = hashes / Math.pow(1000, 3);
			unit = 'G';
		}

		if(hashes >= Math.pow(1000, 4) && hashes < Math.pow(1000, 5)) {
			result = hashes / Math.pow(1000, 4);
			unit = 'T';
		}

    if(hashes >= Math.pow(1000, 5) && hashes < Math.pow(1000, 7)) {
      result = hashes / Math.pow(1000, 5);
      unit = 'P';
    }

		return result.toFixed(2) + ' ' + unit + 'H';
	};
})

.filter('timeClass', function() {
	return function(timestamp, active) {
		if( ! active)
			return 'text-gray';

		return timeClass(timestamp);
	};
})

.filter('blockTimeFilter', function() {
	return function(timestamp) {
		if(timestamp === 0)
			return '∞';

		// var time = Math.floor((new Date()).getTime() / 1000);
		var time = (new Date()).getTime();
		var diff = Math.floor((time - timestamp)/1000);

    if(diff < 0)
      return 'just now'

		if(diff < 60)
			return Math.round(diff) + ' s ago';

		return moment.duration(Math.round(diff), 's').humanize() + ' ago';
	};
})

.filter('networkHashrateFilter', ['$sce', '$filter', function($sce, filter) {
	return function(hashes, isMining) {
    if (angular.isNumber(hashes)) {
      if(hashes === null)
  			hashes = 0;

  		var result = 0;
  		var unit = 'K';

  		if(hashes !== 0 && hashes < 1000) {
  			result = hashes;
  			unit = '';
  		}

  		if(hashes >= 1000 && hashes < Math.pow(1000, 2)) {
  			result = hashes / 1000;
  			unit = 'K';
  		}

  		if(hashes >= Math.pow(1000, 2) && hashes < Math.pow(1000, 3)) {
  			result = hashes / Math.pow(1000, 2);
  			unit = 'M';
  		}

  		if(hashes >= Math.pow(1000, 3) && hashes < Math.pow(1000, 4)) {
  			result = hashes / Math.pow(1000, 3);
  			unit = 'G';
  		}

  		if(hashes >= Math.pow(1000, 4) && hashes < Math.pow(1000, 5)) {
  			result = hashes / Math.pow(1000, 4);
  			unit = 'T';
  		}
      if( !isMining )
        return $sce.trustAsHtml(filter('number')(result.toFixed(1)) + ' <span class="small-hash">' + unit + 'H/s</span>');

      return $sce.trustAsHtml('? <span class="small-hash">' + unit + 'KH/s</span>');

    }

	};
}])

.filter('hashFilter', function() {
	return function(hash) {
		if(typeof hash === 'undefined')
			return "?";

		if(hash.substr(0,2) === '0x')
			hash = hash.substr(2,64);

		return hash.substr(0, 8) + '...' + hash.substr(56, 8);
	}
})

.filter('avgTimeFilter', function() {
	return function(time) {

		if(time < 60)
			return parseFloat(time).toFixed(2) + ' s';

		return moment.duration(Math.round(time), 's').humanize();
	};
})

.filter('avgTimeClass', function() {
	return function(time) {
		return blockTimeClass(time);
	}
})

function timeClass(timestamp)
{
	var diff = ((new Date()).getTime() - timestamp)/1000;

	return blockTimeClass(diff);
}

function blockTimeClass(diff)
{
	if(diff <= 13)
		return 'text-success';

	if(diff <= 20)
		return 'text-warning';

	if(diff <= 30)
		return 'text-orange';

	return 'text-danger'
}
