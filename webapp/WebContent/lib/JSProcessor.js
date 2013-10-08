var JSProcessor = Backbone.Model.extend({
	
	/**
	 * @memberOf JSProcessor
	 */
	run : function() {
		var visSpecs = this.get("binnedPlots").get("visSpecs");
		
		var spec;
		for (var s in visSpecs){
			spec = visSpecs[s];
			if (spec.get("isPlaceHolder")) continue;
			for (var vTileId in spec.get("visualTiles")){
				this.processVisualTile (spec.get("visualTiles")[vTileId], spec );
			}
		}
		
		
		if (!this.isBg())	return;
		
		for (var s in visSpecs){
			
			if (visSpecs[s].get("isPlaceHolder")) continue;
			
			var cols = visSpecs[s].get("cols");
			var binIdx = this.getBinTexIdx(cols);
			
			this.get("binnedPlots").get("rollupStats")[binIdx] =  this.computeMaxPix(gl, visSpecs[s]);
			
			if (visSpecs[s].get("cols").length == 2  ){
				actionManager.updateRangeSlider( this.get("binnedPlots").get("rollupStats")[binIdx][2] * 255,
						this.get("binnedPlots").get("rollupStats")[binIdx][0] * 255);
			}
		}
	},
	
	processVisualTile : function(visualTile, vSpec){
		
		if (visualTile.getNumDataTile() == 0 )
			return;
		
		visualTile.set("pixSum", 0);
		visualTile.set("dataSum", 0);
		
		for (var i in visualTile.getDataTiles()) {
			visualTile.set("pixSum", visualTile.get("pixSum") + 
					this.get("binnedPlots").get("allTiles")[i].pixSum);
			visualTile.set("dataSum", visualTile.get("dataSum") + 
					this.get("binnedPlots").get("allTiles")[i].dataSum);
		}
		
		//var numDim = visualTile.getDataTileDimensionality();
		
		var tileCols = [];
		var binCnts = [];
		
		var dataTile = this.get("binnedPlots").get("allTiles")[visTile.getFirstDataTileId()];
		
		for (var i in dataTile.meta){
			tileCols.push(parseInt( dataTile.meta[i].dim ));
			binCnts.push( dataTile.meta[i].end - dataTile.meta[i].start + 1 );
		}
		
		for (var tileId in visTile.getDataTiles()) {
			var rangeInfo = visTile.getDataTiles()[tileId];
			
			var lo, hi;
			if (this.isBg()){
				lo = [0, 0, 0, 0];
				
				hi = [rangeInfo[ tileCols[0] ].tileEnd - rangeInfo[ tileCols[0] ].tileStart, 
						rangeInfo[ tileCols[1] ].tileEnd - rangeInfo[ tileCols[1] ].tileStart, 
						rangeInfo[ tileCols[2] ].tileEnd - rangeInfo[ tileCols[2] ].tileStart,
						tileCols.length < 4 ? 0: rangeInfo[ tileCols[3] ].tileEnd - rangeInfo[ tileCols[3] ].tileStart];
			}
			else {
				lo = [rangeInfo[ tileCols[0] ].relStart, rangeInfo[ tileCols[1] ].relStart, rangeInfo[ tileCols[2] ].relStart,
						tileCols.length < 4 ? 0: rangeInfo[ tileCols[3] ].relStart];
				
				hi = [rangeInfo[ tileCols[0] ].relEnd, rangeInfo[ tileCols[1] ].relEnd, rangeInfo[ tileCols[2] ].relEnd,
						tileCols.length < 4 ? 0: rangeInfo[ tileCols[3] ].relEnd];
			}
		}
		
	},
	
	resetResultStore : function() {
		
	},
	
	initialize : function() {
		this.set("resultMap", {});
	},
	
	isBg : function(){
		return this.get("isBg");
	}
});