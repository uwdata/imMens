var Networker = Backbone.Model.extend({

	defaults : function() {
		return {
			loading : {},
			tileParams : { tileId : "tileId", data: "data", meta: "meta", globalMax: "globalMax" },
		};
	},

	initialize : function() {
		_.bindAll(this, 'processMetadata');
		_.bindAll(this, 'processTiles');
		_.bindAll(this, 'cachePNGTile');
	},

	/**
	 * @memberOf Networker
	 */
	httpGet : function(params, evt) {
		var request = new XMLHttpRequest(); 
		if (evt == imMensEvents.tilesReceived)
			request.onreadystatechange = this.processTiles(request);
		else if (evt == imMensEvents.metaDataReceived)
			request.onreadystatechange = this.processMetadata(request);
		else
			request.onreadystatechange = this.processLog(request);
		request.open("GET", Networker.servletURI + params, true);
		request.send(null);
	},

	httpPost : function(params){
		var http = new XMLHttpRequest();
		http.open("POST", Networker.servletURI, true);

		//Send the proper header information along with the request
		http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		// http.setRequestHeader("Content-length", params.length);
		// http.setRequestHeader("Connection", "close");

		// http.onreadystatechange = function() {//Call a function when the state changes.
		// 	if(http.readyState == 4 && http.status == 200) {
		// 		alert(http.responseText);
		// 	}
		// }
		http.send(params);
	},
	
	processLog : function(request){
		return function () {
			if (request.readyState != 4 || request.status != 200)
				return;
			
			if (request.responseText != "Not found") {
				actionManager.set("log", request.responseText);
				console.log("log received");
			}
		};
	},
	
	processMetadata : function(request){
		return function() {
			if (request.readyState != 4 || request.status != 200)
				return;
			
			if (request.responseText != "Not found") {
				
				var meta = JSON.parse(request.responseText);
				dataManager.setMetadata(meta);
				
				console.log(dataManager.get("metadata"));
				
				visManager.generateVisSpecs();
				actionManager.generateControls();
			}
		};
	},

	processTiles : function(request) {
		var nwker = this;
		
		return function () {
			if (request.readyState != 4 || request.status != 200)
				return;
			
			if (request.responseText != "Not found") {
				var arr = JSON.parse(request.responseText);
				for (var i = 0; i < arr.length; i++){
					nwker.cachePNGTile(arr[i]);
				}
			}
		};
	},
	
	cachePNGTile : function(tileJSON){
		
		if (Networker.loading.hasOwnProperty(tileJSON.tileURL)){
			return;
		}
		
		Networker.loading[tileJSON.tileURL] = true;
		var pngTile = new Image();
		pngTile.src = tileJSON.tileURL; 
		pngTile.id = tileJSON.tileId;
	    pngTile.factor = tileJSON.factor;
	    pngTile.forVTile = tileJSON.forVTile;
	    pngTile.globalMaxProj = tileJSON.globalMaxProj;
	    pngTile.globalMinProj = tileJSON.globalMinProj;
		pngTile.meta = {};
		var dims = tileJSON.tileId.split("x");
		var temp;
		for (var j = 0; j < dims.length; j++) {
			temp = dims[j].split("-");
			pngTile.meta[parseInt(temp[0])] = {"dim": parseInt(temp[0]),
												"start": parseInt(temp[1]),
												"end": parseInt(temp[2]),
												"zmlevel": parseInt(temp[3])
												};
		};
		
		pngTile.onerror = function(){ 
  			console.log(pngTile.src + " does not exist") ;
  		};
  		
  		pngTile.onload = function(){
  			delete Networker.loading[tileJSON.tileURL];
  		    dataManager.addTile(pngTile.id, pngTile);
  		    var currentTiles = visManager.get("activeWkSheet").get("allRequiredTiles");
  		    if (currentTiles.indexOf(pngTile.forVTile) > 0)
				visManager.updateWorkSheets({recompute:true});
  		};
	},
	
	processTiles_deprecated : function() {
		var request = this.get("request");
		if (request.readyState != 4 || request.status != 200)
			return;
		
		if (request.responseText != "Not found") {
			var tiles = JSON.parse(request.responseText);

			var tileSize, imgSize, numPerPix = DataManager.numPerPix;
			
			var tileParams = this.get("tileParams");
			
			var cols, zms, bins;
			for ( var i = 0; i < tiles.length; i++) {
				var meta = tiles[i][tileParams.meta];
				
				tileSize = 1;
				for (var col in meta){
					tileSize *= meta[col].end - meta[col].start + 1;
				}
				
				if (DataManager.useWebGL) {
					var imgTile;
					
					imgSize = DataUtil.logCeil(Math.ceil(Math.sqrt(tileSize / numPerPix)),
							2);
					
					imgTile = DataUtil.json2img(JSON.parse(tiles[i][tileParams.data]), numPerPix, imgSize, tiles[i][tileParams.globalMax]);
					imgTile.meta = meta;
					imgTile.id = tiles[i][tileParams.tileId];
					
					cols = [];
					zms = [];
					bins = [];
					for (var j in meta){
						cols.push(meta[j].dim);
						zms.push(meta[j].zmlevel);
						bins.push(meta[j].start);
					}
					
					dataManager.addTile( cols, zms, bins, tiles[i][tileParams.tileId], imgTile);
				} else {
					var arrTile = new Uint16Array(tileSize);
					arrTile = DataUtil.json2arr(tiles[i][tileParams.data], numPerPix, tiles[i][tileParams.globalMax], arrTile);
					arrTile.meta = meta;
					arrTile.id = tiles[i][tileParams.tileId];
					
					cols = [];
					zms = [];
					bins = [];
					for (var j in meta){
						cols.push(meta[j].dim);
						zms.push(meta[j].zmlevel);
						bins.push(meta[j].start);
					}
					dataManager.addTile( cols, zms, bins, tiles[i][tileParams.tileId], arrTile);
				}
			}
			visManager.displayConstructionUI();
		}//end if
	},

}, {
	loading : {},
	servletURI : "/webapp/ImmensServlet?",
});