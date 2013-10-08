/*
 * information about range and zoom level for a dimension, to be used in visual tiles, data tiles and vis specs
*/
var DimInfo = Backbone.Model.extend({
	/**
	 * @memberOf DimInfo
	 */
	setInfo : function(dim, zm, start, end){
		var d = parseInt(dim);
		if (d == NaN)
			d = dim;
		this.set("info", {dim: d, zoom:zm, startBin:start, endBin:end});
	},
	
	toString : function(){
		var info = this.get("info");
		return info.dim + "-" +  info.startBin + "-" + info.endBin + "-" + info.zoom ;
	},
	
	setStartBin : function(s){
		this.get("info").startBin = s;
	},
	
	getStartBin : function(){
		return this.get("info").startBin;
	},
	
	setEndBin : function(e){
		this.get("info").endBin = e;
	},
	
	getEndBin : function(){
		return this.get("info").endBin;
	},
	
	setZoom : function(z){
		this.get("info").zoom = z;
	},
	
	getZoom : function(){
		return this.get("info").zoom;
	},
	
	setDim : function(d){
		if (parseInt(d) == NaN)
			this.get("info").dim = d;
		else
			this.get("info").dim = parseInt(d);
	},
	
	getDim : function(){
		return this.get("info").dim;
	},

	//e.g.
	// 212 - 233 :  [] 
	// 212 - 333 :  [256]
	// 212 - 433 :  [256]
	// 212 - 33 :  [256, 0]
	// 468 - 33 :  [0] 
	getSpannedTileBorders: function(){
		var info = this.get("info");
		var binCnt = dataManager.get("metadata")[info.dim].totalBinCnt[info.zoom];
		var binCntPerTile = dataManager.get("metadata")[info.dim].binsPerTile;
		var startBin = this.getStartBin(); //Math.floor(this.getStartBin()/binCntPerTile) * binCntPerTile;
		var endBin =  this.getStartBin() > this.getEndBin() ? this.getEndBin() + binCnt : this.getEndBin();

		var startBorder = (Math.floor(startBin/binCntPerTile) + 1) * binCntPerTile;
		var endBorder = Math.floor(endBin/binCntPerTile) * binCntPerTile;

		var tileRanges = [];
		
		var tileInfo;
		while (startBorder <= endBorder) {
			if (startBorder >= binCnt - 1) {
				startBorder = 0;
				endBorder -= binCnt;
			} 
			tileRanges.push(startBorder);
			startBorder += binCntPerTile;
		}
		return tileRanges;
	},
	
	//returns an array, where each value is the start bin of a new tile
	getTileBins : function() {
		var info = this.get("info");
		var binCnt = dataManager.get("metadata")[info.dim].totalBinCnt[info.zoom];
		var binCntPerTile = dataManager.get("metadata")[info.dim].binsPerTile;
		var startBin = Math.floor(this.getStartBin()/binCntPerTile) * binCntPerTile;
		var endBin =  this.getStartBin() > this.getEndBin() ? this.getEndBin() + binCnt : this.getEndBin();
		var tileRanges = [];
		
		var tileInfo;
		if (binCnt/binCntPerTile <= 1) {
			tileInfo = new DimInfo;
			tileInfo.setInfo(info.dim, info.zoom, startBin, startBin + binCntPerTile - 1);
			tileRanges.push(tileInfo);
		} else {
			while (startBin <= endBin) {
				tileInfo = new DimInfo;
				tileInfo.setInfo(info.dim, info.zoom, startBin, startBin + binCntPerTile - 1);
				tileRanges.push(tileInfo);
				if (startBin + binCntPerTile == binCnt) {
					startBin = 0;
					endBin -= binCnt;
				} else {
					startBin += binCntPerTile;
				}
			}
		}
		return tileRanges;
	}, 
	
	initialize : function() {
		this.set("info", {});
	},
	
	
});