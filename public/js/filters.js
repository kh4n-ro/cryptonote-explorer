
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


.filter('hashratefilter', function() {
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

.filter('difficultyfilter', function() {
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

		return result.toFixed(2) + ' ' + unit;
	};
})

.filter('bytesfilter', function() {
	return function(hashes) {
		var result = 0;
		var unit = '';

		if(hashes !== 0 && hashes < 1024) {
			result = hashes;
			unit = 'B';
		}

		if(hashes >= 1024 && hashes < Math.pow(1024, 2)) {
			result = hashes / 1024;
			unit = 'KB';
		}

		if(hashes >= Math.pow(1024, 2) && hashes < Math.pow(1024, 3)) {
			result = hashes / Math.pow(1024, 2);
			unit = 'MB';
		}

		if(hashes >= Math.pow(1024, 3) && hashes < Math.pow(1024, 4)) {
			result = hashes / Math.pow(1024, 3);
			unit = 'GB';
		}

		if(hashes >= Math.pow(1024, 4) && hashes < Math.pow(1024, 5)) {
			result = hashes / Math.pow(1024, 4);
			unit = 'TB';
		}

    if(hashes >= Math.pow(1024, 5) && hashes < Math.pow(1024, 7)) {
      result = hashes / Math.pow(1024, 5);
      unit = 'PB';
    }

		return result.toFixed(2) + ' ' + unit;
	};
})

.filter('valuesfilter', function() {
	return function(units) {
    var result = units / Math.pow(10, 12);
		return result.toFixed(12) + ' XAO';
	};
})

.filter('tabvaluesfilter', function() {
	return function(units) {
    var result = units / Math.pow(10, 12);
		return result.toFixed(8) + ' XAO';
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

.filter('hashFilter', function() {
	return function(hash) {
		if(typeof hash === 'undefined')
			return "?";

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
