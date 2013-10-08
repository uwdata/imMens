/*
 * a data structure for indexing and storing multidimensional data tiles
 * a 3D data tiles T has an id like this: c1-s1-e1-z1xc2-s2-e2-z2xc3-s3-e3-z3 
 * key c1-s1-e1-z1 will return a list of tiles containing T
 * key c1-s1-e1-z1, c2-s2-e2-z2 will return a smaller list of tiles containing T
 * key c1-s1-e1-z1, c2-s2-e2-z2, c3-s3-e3-z3 will return a list containing just T
 * the same can be extended to 4D tiles
 * when both 3D and 4D tiles are present, the list should contain 3D tiles before 4D ones
 * the keys must be sorted in ascending order by the column index
 */
var M2MHash = Backbone.Model.extend({
	
	removeDataTile : function(id, tile){
		var delim = this.get("tile-delim");
		var keys = id.split(delim);
		var zms = keys.map(function(d){return parseInt(d.split(DataManager.delimiter)[3]);});
		var map = this.get("map");
		var key, idx;
		var checkZmSum = function(previousValue, currentValue, index, array) {
			return previousValue + currentValue;
		};
		for (var i = 0; i < keys.length; i++) {
			key = keys[i];
			if (zms.reduce(checkZmSum,0) == zms[i]) {
				if (!map.hasOwnProperty(key))
					continue;
				idx = map[key].indexOf(tile);
				if (idx >= 0)
					map[key].splice(idx, 1);
				if (map[key].length == 0)
					delete map[key];
			}

			for (var j = i + 1; j < keys.length; j++) {
				key = keys[i]+delim+keys[j];
				if (zms.reduce(checkZmSum,0) == zms[i] + zms[j]) {
					if (!map.hasOwnProperty(key))
						continue;
					idx = map[key].indexOf(tile);
					if (idx >= 0)
						map[key].splice(idx, 1);
					if (map[key].length == 0)
						delete map[key];
				}
				
				for (var k = j + 1; k < keys.length; k++) {
					key = keys[i]+delim+keys[j]+delim+keys[k];
					if (zms.reduce(checkZmSum,0) == zms[i] + zms[j] + zms[k]) {
						if (!map.hasOwnProperty(key))
							continue;
						idx = map[key].indexOf(tile);
						if (idx >= 0)
							map[key].splice(idx, 1);
						if (map[key].length == 0)
							delete map[key];
					}
					
					if (keys.length == 4) {
						for (var l = k + 1; l < keys.length; l++) {
							key = keys[i]+delim+keys[j]+delim+keys[k]+delim+keys[l];
							if (!map.hasOwnProperty(key))
								continue;
							idx = map[key].indexOf(tile);
							if (idx >= 0)
								map[key].splice(idx, 1);
							if (map[key].length == 0)
								delete map[key];
						}
					}
				}
				
			}
		}
	},
	
	addDataTile : function(id, tile) {
		var delim = this.get("tile-delim");
		var keys = id.split(delim);
		var zms = keys.map(function(d){return parseInt(d.split(DataManager.delimiter)[3]);});
		var map = this.get("map");
		var key;
		var checkZmSum = function(previousValue, currentValue, index, array) {
			return previousValue + currentValue;
		};
		for (var i = 0; i < keys.length; i++) {
			key = keys[i];
			if (zms.reduce(checkZmSum,0) == zms[i]) {
				if (!map.hasOwnProperty(key))
					map[key] = [];
				map[key].push(tile);
			}

			for (var j = i + 1; j < keys.length; j++) {
				key = keys[i]+delim+keys[j];
				if (zms.reduce(checkZmSum,0) == zms[i] + zms[j]) {
					if (!map.hasOwnProperty(key))
						map[key] = [];
					map[key].push(tile);
				}
				
				for (var k = j + 1; k < keys.length; k++) {
					key = keys[i]+delim+keys[j]+delim+keys[k];
					if (zms.reduce(checkZmSum,0) == zms[i] + zms[j] + zms[k]) {
						if (!map.hasOwnProperty(key))
							map[key] = [];
						map[key].push(tile);
					}
					
					if (keys.length == 4) {
						for (var l = k + 1; l < keys.length; l++) {
							key = keys[i]+delim+keys[j]+delim+keys[k]+delim+keys[l];
							if (!map.hasOwnProperty())
								map[key] = [];
							map[key].push(tile);
						}
					}
				}
				
			}
		}
	}, 
	
	getDataTile : function(required) {
		var map = this.get("map");
		if (map.hasOwnProperty(required)){
			return map[required][0];
		} else {
			return undefined;
		}
	},
 	
	initialize : function() {
		this.set("map", {});
		this.set("tile-delim", "x");
	},
});
