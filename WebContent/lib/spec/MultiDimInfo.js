/**
 * A MultiDimInfo contains dimension infos for multiple dimensions, 
 * for each dimension, it contains four arguments: dimension idx, tile start, tile end, zoom
 * A 2D MultiDimInfo corresponds to a selection in a 2D plot,
 * A 3D/4D tile corresponds to a selection in a data tile
 *
**/

var MultiDimInfo = Backbone.Model.extend({
	
	/**
	 * @memberOf MultiDimInfo
	 */
	addDimension : function(dimInfo) {
		var dimensions = this.get("dimensions");
		dimensions[dimInfo.getDim()] = dimInfo;
	},
	
	hasDimension: function(dim){
		return this.get("dimensions").hasOwnProperty(dim);
	},
	
	//the start and end bins snap to tile borders
	getRequiredDataTiles : function() {
		var dims = Object.keys(this.get("dimensions")).sort(function(a,b) {return a - b});
		
		var tileRanges = [];
		for (var i = 0; i < dims.length; i++) {
			//if (dims[i] >= 0) //refer to getVisualTiles in visSpec
			tileRanges.push(this.getDimInfo(dims[i]).getTileBins());
		}
		
		var getAllTilePerm = function(tR, dimIdx, product, tileSoFar) {
			if (tileSoFar != "")	tileSoFar += "x"; 
			if (dimIdx == tR.length - 1) {
				for (var i = 0; i < tR[dimIdx].length; i++) {
					product.push(tileSoFar + tR[dimIdx][i].toString());
				}
			} else {
				for (var i = 0; i < tR[dimIdx].length; i++) {
					getAllTilePerm(tR, dimIdx + 1, product, tileSoFar + tR[dimIdx][i].toString());
				}
			} 
			
		};
		
		var result = [];
		getAllTilePerm(tileRanges, 0, result, "");
		return result;
	},
	
	getDimInfo : function(dim) {
		return this.get("dimensions")[dim];
	},
	
	getDimensionKeys: function(){
		return Object.keys(this.get("dimensions"));
	},
	
	getDimensionality : function() {
		return Object.keys(this.get("dimensions")).length;
	},
	
	shallowCopy : function(){
		var copy = new MultiDimInfo;
		for (var k in this.get("dimensions"))
			copy.addDimension(this.get("dimensions")[k]);
		return copy;
	},
	
	changeZoom : function(deltaZm){
		var copy = new MultiDimInfo;
		var dimInfo;
		for (var k in this.get("dimensions")){
			dimInfo = this.get("dimensions")[k];
			var newDimInfo = new DimInfo;
			newDimInfo.setInfo(dimInfo.getDim(), dimInfo.getZoom()+deltaZm, 
								dimInfo.getStartBin()*2, dimInfo.getEndBin()*2);
			copy.addDimension(newDimInfo);
		}
			
		return copy;
	},
	
	initialize : function() {
		this.set("dimensions", {});
	},
});