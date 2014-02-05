var DataManager = Backbone.Model.extend({
	
	/**
	 * @memberOf DataManager
	 */
	setMetadata : function(meta){
		this.set("metadata", meta);
	},
					
	getDataTiles : function(dTileIds) {
		var found = [], toFetch = [];
		for (var i = 0; i < dTileIds.length; i++) {
			var tile = this.get("hash").getDataTile(dTileIds[i]);
			if (tile)
				found.push(tile);
			else
				toFetch.push(dTileIds[i]);
		}
		if (toFetch.length > 0){
			this.fetchTiles(toFetch);
		}
		return found;
	},
	
	getDataTiles_deprecated: function(dimInfos){
		var cols = [], zms = [], startBins = [], endBins = [];
		for (var dim in dimInfos){
			cols.push( dimInfos[dim].getDim() );
			zms.push( dimInfos[dim].getZoom() );
			startBins.push( dimInfos[dim].getStartBin() );
			endBins.push( dimInfos[dim].getEndBin() );
		}
		
		var result = [];
		var meta = this.get("metadata");
		
		//search for 3D tiles, then 4D
		var keys = Object.keys(this.get("cache"));
		keys.sort(function(a,b) {return a.length-b.length;});
		for (var c = 0; c < keys.length; c++) {
			var dims = keys[c].split(DataManager.delimiter);
			var colIdxInTile = [];
			var match = true;
			for (var i = 0; i < cols.length; i++) {
				if (dims.indexOf(cols[i] + ":" + zms[i]) < 0) {
					match = false;
					break;
				}
				colIdxInTile.push(dims.indexOf(cols[i] + ":" + zms[i]));
			}
			
			if (!match)	continue;
			
			//check the zoom level for rest of the cols is 0
			for (var j = 0; j < dims.length; j++) {
				var temp = dims[j].split(":");
				//console.log(temp);
				if (cols.indexOf( parseInt(temp[0])) < 0 && parseInt(temp[1]) != 0) {
					match = false;
					break;
				}
			}
			if (!match)	continue;
			
			//check start bin
			for (var s in this.get("cache")[keys[c]]) {
				var tileBins = s.split(DataManager.delimiter).map(function(x){return parseInt(x);});

				var binNotFit = false;
				for (var i = 0; i < cols.length; i++) {
					if (tileBins[colIdxInTile[i]] + meta[ cols[i] ].binsPerTile - 1 < startBins[i] || 
							tileBins[colIdxInTile[i]] > endBins[i]) {
						binNotFit = true;
						break;
					}
				}
				if (binNotFit)	continue;

				result.push( this.get("cache")[keys[c]][s] );
			}
			
			if (result.length > 0)
				return result;
		}
		return result;
	},
	
	getTiles_deprecated : function(cols, zms, startBins, endBins){
		
		var result = [];
		var meta = this.get("metadata");
		
		for (var c in this.get("cache")){
			var dims = c.split(DataManager.delimiter);
			var colIdxInTile = [];
			var match = true;
			for (var i = 0; i < cols.length; i++){
				if ( dims.indexOf( cols[i] + ":" + zms[i] ) < 0 ){
					match = false;
					break;
				}
				colIdxInTile.push( dims.indexOf( cols[i] + ":" + zms[i] ) );
			}
			
			if (!match)	continue;
			
			//check the zoom level for rest of the cols is 0
			for (var j = 0; j < dims.length; j++){
				var temp = dims[j].split(":");
				//console.log(temp);
				if ( cols.indexOf( parseInt(temp[0]) ) < 0 && parseInt(temp[1]) != 0 ){
					match = false;
					break;
				}
			}
			if (!match)	continue;
			
			//check start bin
			for (var s in this.get("cache")[c]){
				var tileBins = s.split(DataManager.delimiter).map(function(x){return parseInt(x);});

				var binNotFit = false;
				for (var i = 0; i < cols.length; i++){
					if (tileBins[colIdxInTile[i]] + meta[i] < startBins[i] || 
							tileBins[colIdxInTile[i]] > endBins[i] ){
						binNotFit = true;
						break;
					}
				}
				if (binNotFit)	continue;
				
				result.push( this.get("cache")[c][s] );
				console.log(cols, zms, "found!", c, s);
			}
			
			if (result.length > 0)
				return result;
			
		}
		return result;
	},
	
	//e.g. cols: [0,1], zoom: [4, 4], startIndices: [250, 1004], endBins: [390, 590]
	getTilesDeprecated : function(cols, zms, startBins, endBins){
		var result = [];
		//array of objects, {binsPerTile, dType, dim}
		var meta = this.get("metadata");
		
		for (var c in this.get("cache")){
			var tileCols = c.split(DataManager.delimiter).map(function(x){return parseInt(x);});
			var colNotFit = false;
			var colIdxInTile = [];
			for (var i = 0; i < cols.length; i++){
				if (tileCols.indexOf( cols[i] ) < 0){
					colNotFit = true;
					break;
				}
				colIdxInTile.push( tileCols.indexOf( cols[i] ) );
			}
			if (colNotFit)	continue;
			
			//check zoom level
			for (var z in this.get("cache")[c]){
				var tileZms = z.split(DataManager.delimiter).map(function(x){return parseInt(x);});
				var zmNotFit = false;
				for (var i = 0; i < colIdxInTile.length; i++){
					if (tileZms[colIdxInTile[i]] != zms[i] ){
						zmNotFit = true;
						break;
					}
				}
				if (zmNotFit)	continue;
				
				//check start bin
				for (var s in this.get("cache")[c][z]){
					var tileBins = s.split(DataManager.delimiter).map(function(x){return parseInt(x);});
					var binNotFit = false;
					for (var i = 0; i < cols.length; i++){
						if (tileBins[colIdxInTile[i]] + meta[i] < startBins[i] || 
								tileBins[colIdxInTile[i]] > endBins[i] ){
							binNotFit = true;
							break;
						}
					}
					if (binNotFit)	continue;
					
					result.push( this.get("cache")[c][z][s] );
					console.log("found!", c, z, s);
				}
				if (result.length > 0)
					return result;
			}//end zoom level	
		}//end columns
		return result;
	},
	
	addTile : function(id, tile){
//		if (id == "2-0-11-0x3-0-30-0x4-0-23-0"){
//			var cv = document.createElement("canvas");
//			var ctxt, img, dat;
//			cv.width = tile.width;
//			cv.height = tile.height;
//			ctxt = cv.getContext("2d");
//			ctxt.drawImage(tile,0,0);
//			dat = ctxt.getImageData(0,0,100,100);
//			var temp = [];
//			for (var i = 0; i < dat.data.length; i++)
//				if (dat.data[i] > 0)
//					temp.push(dat.data[i]);
//			console.log(id, d3.sum(temp));
//		}
		if (Object.keys(this.get("cacheById")).length > DataManager.maxCacheSize){
			var toRemove = Object.keys(this.get("cacheById")).splice(20,5);
			for (var i = 0; i < toRemove.length; i++){
				this.get("hash").removeDataTile(toRemove[i], this.get("cacheById")[toRemove[i]]);
				delete this.get("cacheById")[toRemove[i]];				
			}
		}

		this.get("hash").addDataTile(id, tile);
		this.get("cacheById")[id] = tile;
	},
	
	//e.g. cols: [0,1,3], zoom: [4, 4, 0], startIndices: [256, 1024, 0]
	//we assume the cols are sorted
	addTile_deprecated : function(cols, zoom, startIndices, id, tile){
		var cache = this.get("cache");
		
		var key = "";
		for (var i = 0; i < cols.length; i++){
			key += cols[i]+":"+zoom[i];
			if ( i != cols.length - 1)
				key += DataManager.delimiter;
		}
		if (!cache.hasOwnProperty(key)){
			cache[key] = {};
		}
		var binID = startIndices.join(DataManager.delimiter);
		cache[key][binID] = tile;
		
		this.get("cacheById")[id] = tile;
	},
	
	hasTile : function(id){
		return this.get("cacheById").hasOwnProperty(id);
	},

	fetchTiles : function(tiles){
		var toFetch = [];
		for ( var i = 0; i < tiles.length; i++) {
			if (!this.get("fetching").hasOwnProperty(tiles[i])){
				this.get("fetching")[tiles[i]] = true;
				toFetch.push(tiles[i]);
			}
		}
		if (toFetch.length > 0){
			var networker = new Networker();
			networker.httpGet("q="+toFetch.join("_")+"&dataset="+currentDataSet, imMensEvents.tilesReceived);
		}
		
		if (Object.keys(this.get("fetching")).length > 1500)
			this.set("fetching", {});
		
		//VisManager.updateStatus(true, "Retrieving Data ...");
	},
	
	fetchMetadata : function(){
		VisManager.updateStatus(true, "Retrieving Metadata ...");
		var networker = new Networker();
		networker.httpGet("meta=1&dataset="+currentDataSet, imMensEvents.metaDataReceived);
	},
	
	defaults : function() {
		return {
			cacheById: {},
			hash: new M2MHash,
			fetching: {},
		};
	},

	initialize : function() {
		//_.bindAll(this, 'tilesReceived');
	},
}, {
	dataTypes: { latitude:0, longitude:1, numerical:2, categorical:3, ordinal:4},
	delimiter: "-",
	numPerPix: 2,
	useWebGL: true,
	maxCacheSize: 600
});