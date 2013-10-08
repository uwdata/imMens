/*
 * properties of a visual tile
 * 	containerX: 442
	containerY: 221
	dataSum: 959985
	dataTiles: an array of objects, 
		an example is 0-768-1023-4x1-512-767-4x4-0-23-0 : {0: {tileStart, selStart, relStart, tileEnd, selEnd, relEnd}}
	dimensions: associative array of DimInfo objects
	idxWithSpec: 3
	pixSum: 959985
	visHeight: 329
	visWidth: 278
	xOffsetPix: 0
	yOffsetPix: 0
 */

var VisualTile = Backbone.Model.extend({
	
	/**
	 * @memberOf VisualTile
	 */
	addDimension : function(dim, zm, start, end){
		
		var dimensions = this.get("mdi");
		var dimInfo = new DimInfo;
		dimInfo.setInfo(dim, zm, start, end);
		dimensions.addDimension(dimInfo);
	},

	
	setIdx : function(c){
		this.set("idxWithSpec", c);
	},
	
	getIdx : function(){
		return this.get("idxWithSpec");
	},
	
	resetDataTiles : function(){
		//use array instead of object because the same data tile can be added to 
		//a visual tile multiple times, in a geo view
		this.set("dataTiles",[]);	
		this.set("dataTileIds", []);	
	},
	
	//not actually adding the tile (with data), but metainfo about the tile and how to use the tile
	addDataTile : function(dTile, print){
		var temp = {};
		
		for (var m in dTile.meta){
			temp[m] = { tileStart: dTile.meta[m].start, tileEnd: dTile.meta[m].end,
						selStart: dTile.meta[m].start, selEnd: dTile.meta[m].end,
						};
			temp[m].relStart = temp[m].selStart - temp[m].tileStart;
			temp[m].relEnd = temp[m].selEnd - temp[m].tileStart;
		}
		//temp.id = dTile.id;
		//this.get("dataTiles")[ dTile.id ] = temp;
		this.get("dataTiles").push(temp);
		this.get("dataTileIds").push(dTile.id);
	},

	updateDataTileWithBrushInfo_new : function(brushFilter){
		var dTiles = this.get("dataTiles");
		if (!brushFilter){
			// for (var i = 0; i < dTiles.length; i++) {
			// 	dTiles[i].selStart = dTiles[i].tileStart;
			// 	dTiles[i].selEnd =  dTiles[i].tileEnd;
			// 	dTiles[i].relStart = dTiles[i].selStart - dTiles[i].tileStart;
			// 	dTiles[i].relEnd = dTiles[i].selEnd - dTiles[i].tileStart;
			// }
			return;
		}

		var brushIntervals = [], s;
		for (var dim in brushFilter) {
			var brushStart = brushFilter[dim].getStartBin();
			var brushEnd = brushFilter[dim].getEndBin();
			var intervals = [];
			var zm = brushFilter[dim].getZoom();
			var spannedTileBorders = brushFilter[dim].getSpannedTileBorders();
			s = new DimInfo;
			s.setDim(dim);
			s.setStartBin(brushStart);
			//intervals.push(brushStart);
			for (var i = 0; i < spannedTileBorders.length; i++){
				if (spannedTileBorders[i]==0)
					t = spannedTileBorders[i]+dataManager.get("metadata")[dim].totalBinCnt[zm]-1;	
				else
					t = spannedTileBorders[i]-1;
				s.setEndBin(t);
				s.setZoom(zm);
				intervals.push(s);
				s = new DimInfo;
				s.setDim(dim);
				s.setStartBin(spannedTileBorders[i]);
			}
			s.setEndBin(brushEnd);
			s.setZoom(zm);
			intervals.push(s);
			brushIntervals.push(intervals);
		}
		//console.log(brushIntervals);

		var dim1 = brushIntervals[0];
		if (brushIntervals.length == 2)
			var dim2 = brushIntervals[1];

		var selVTiles = [], selVTile;
		for (var i = 0; i < dim1.length; i++){
			if (dim2){
				for (var j = 0; j < dim2.length; j++){
					//console.log(dim1[i].getDim(), dim2[j].getDim());
					selVTile = {};
					selVTile[dim1[i].getDim()] = dim1[i];
					selVTile[dim2[j].getDim()] = dim2[j]; 		
					selVTiles.push(selVTile);
				}
			} else {
				selVTile = {};
				selVTile[dim1[i].getDim()] = dim1[i];
				selVTiles.push(selVTile);
			}
		}

		var dTile, updated = [];
		for (var i = 0; i < selVTiles.length; i++){
			for (var d = 0; d < dTiles.length; d++) {
				dTile = dTiles[d];
				if (updated.indexOf(d) >= 0)
					continue;
				if (this.trySetSelection(dTile, selVTiles[i])){
					updated.push(d);
					break;
				}
			}
		}
		//set the rest of the data tiles that match the dimensions with no selection
		for (var d = 0; d < dTiles.length; d++) {
			if (updated.indexOf(d) < 0) {
				dTile = dTiles[d];
				for (var dim in brushFilter){
					if (!dTile[dim])
						return;
				}
				for (var dim in dTile){
					dTile[dim].selStart = dTile[dim].tileStart;
					dTile[dim].selEnd = dTile[dim].tileStart - 1;
					dTile[dim].relStart = dTile[dim].selStart - dTile[dim].tileStart;
					dTile[dim].relEnd = dTile[dim].selEnd - dTile[dim].tileStart;
				}
			}
		}

		//console.log("---------------", updated);
		//console.log(selVTiles);
	},

	trySetSelection : function(dTileInfo, selVTile){
		var match = true;
		for (var dim in selVTile){
			//dim = selVTile[i].getDim();
			if (!dTileInfo[dim] || dTileInfo[dim].tileStart > selVTile[dim].getStartBin() || dTileInfo[dim].tileEnd < selVTile[dim].getEndBin()){
				match = false;
				break;
			}
		}
		if (match){
			for (var dim in dTileInfo){
				if (selVTile.hasOwnProperty(dim)){
					dTileInfo[dim].selStart = selVTile[dim].getStartBin();
					dTileInfo[dim].selEnd = selVTile[dim].getEndBin();
					dTileInfo[dim].relStart = dTileInfo[dim].selStart - dTileInfo[dim].tileStart;
					dTileInfo[dim].relEnd = dTileInfo[dim].selEnd - dTileInfo[dim].tileStart;
				} else {
					dTileInfo[dim].selStart = dTileInfo[dim].tileStart;
					dTileInfo[dim].selEnd = dTileInfo[dim].tileEnd;
					dTileInfo[dim].relStart = dTileInfo[dim].selStart - dTileInfo[dim].tileStart;
					dTileInfo[dim].relEnd = dTileInfo[dim].selEnd - dTileInfo[dim].tileStart;
				}
			}

			// for (var i = 0; i < selVTile.length; i++){
			// 	dim = selVTile[i].getDim();
				
			// 	console.log(dTileInfo[dim].selStart, selVTile[i].getStartBin(), dTileInfo[dim].selEnd, selVTile[i].getEndBin());
			// }
			//console.log(dTileInfo, selVTile);
			return true;
		} else {
			// for (var dim in dTileInfo){
			// 	dTileInfo[dim].selStart = dTileInfo[dim].tileStart;
			// 	dTileInfo[dim].selEnd = dTileInfo[dim].tileStart;
			// 	dTileInfo[dim].relStart = dTileInfo[dim].selStart - dTileInfo[dim].tileStart;
			// 	dTileInfo[dim].relEnd = dTileInfo[dim].selEnd - dTileInfo[dim].tileStart;
			// }
			return false;
		}
	},

	// updateDataTileWithBrushInfo : function(brushFilter) {
	// 	var dTiles = this.get("dataTiles");
	// 	var temp, intersection;
	// 	for (var d = 0; d < dTiles.length; d++) {
	// 		temp = dTiles[d];
	// 		if (brushFilter && this.dataTileMatchFilter(temp,brushFilter)) {
	// 			for (var dim in brushFilter) {
	// 				var brushStart = brushFilter[dim].getStartBin();
	// 				var brushEnd = brushFilter[dim].getEndBin();
	// 				var brushIntervals = [];
	// 				if (brushStart > brushEnd){
	// 					var zm = brushFilter[dim].getZoom();
	// 					var spannedTileBorders = brushFilter[dim].getSpannedTileBorders();
	// 					brushIntervals.push(brushStart);
	// 					for (var i = 0; i < spannedTileBorders.length; i++){
	// 						if (spannedTileBorders[i]==0)
	// 							brushIntervals.push(spannedTileBorders[i]+dataManager.get("metadata")[dim].totalBinCnt[zm]-1);	
	// 						else
	// 							brushIntervals.push(spannedTileBorders[i]-1);
	// 						brushIntervals.push(spannedTileBorders[i]);	
	// 					}
	// 					// brushIntervals.push(brushStart, dataManager.get("metadata")[dim].totalBinCnt[zm]);
	// 					brushIntervals.push(brushEnd);
	// 					// console.log(brushIntervals);
	// 				} else {
	// 					brushIntervals.push(brushStart, brushEnd);
	// 				}

	// 				var tileStart = temp[dim].tileStart;
	// 				var tileEnd = temp[dim].tileEnd;

	// 				for (var i = 0; i < brushIntervals.length - 1; i=i+2){
	// 					intersection = this.getIntersection(tileStart, tileEnd, brushIntervals[i], brushIntervals[i+1]);
	// 					if (intersection[1]!=intersection[0])
	// 						break;
	// 				}
	// 				temp[dim].selStart = intersection[0];
	// 				temp[dim].selEnd = intersection[1];

	// 				// if (dim == 0){
	// 				// 	console.log(tileStart, tileEnd, intersection[0], intersection[1]);
	// 				// }

	// 				temp[dim].relStart = temp[dim].selStart - temp[dim].tileStart;
	// 				temp[dim].relEnd = temp[dim].selEnd - temp[dim].tileStart;
	// 			}
	// 		} else {
	// 			for (var dim in temp) {
	// 				// if (brushFilter && brushFilter[dim]){
	// 				// 	temp[dim].selStart = temp[dim].tileStart;
	// 				// 	temp[dim].selEnd =  temp[dim].tileStart;
	// 				// 	temp[dim].relStart = temp[dim].selStart - temp[dim].tileStart;
	// 				// 	temp[dim].relEnd = temp[dim].selEnd - temp[dim].tileStart;
	// 				// } else {
	// 					temp[dim].selStart = temp[dim].tileStart;
	// 					temp[dim].selEnd =  temp[dim].tileEnd;
	// 					temp[dim].relStart = temp[dim].selStart - temp[dim].tileStart;
	// 					temp[dim].relEnd = temp[dim].selEnd - temp[dim].tileStart;
	// 				//}
	// 			}
	// 		}
	// 	}
	// },

	dataTileMatchFilter: function(dTile, brushFilter) {
		for (var dim in brushFilter) {
			if (!dTile.hasOwnProperty(dim))	{ return false; }
			// else if (brushFilter[dim].getStartBin() > dTile[dim].tileEnd || brushFilter[dim].getEndBin() < dTile[dim].tileStart)
			// 	return false;
		}
		return true;
	},

	getIntersection: function(t1, t2, s1, s2){
		if (s2 < t1 || t2 < s1)	{ return [t1,t1]; }
		else { return [Math.max(t1, s1), Math.min(t2, s2)]; }
	},
	
	// updateDataTileWithBrushInfo : function(brushFilter){
	// 	var dTiles = this.get("dataTiles");
	// 	var temp;
	// 	for (var d in dTiles){
	// 		temp = dTiles[d];
	// 		if (brushFilter){
	// 			for (var dim in brushFilter){
	// 				if (!temp.hasOwnProperty(dim))	continue;
					
	// 				var brushStart = brushFilter[dim].getStartBin();
	// 				var brushEnd = brushFilter[dim].getEndBin();
	// 				var tileStart = temp[dim].tileStart;
	// 				var tileEnd = temp[dim].tileEnd;
	// 				temp[dim].selStart = tileStart < brushStart? brushStart : tileStart;
	// 				temp[dim].selEnd = tileEnd < brushEnd ? tileEnd : brushEnd;
	// 				temp[dim].relStart = temp[dim].selStart - temp[dim].tileStart;
	// 				temp[dim].relEnd = temp[dim].selEnd - temp[dim].tileStart;
	// 			}

	// 		}
	// 		else {
	// 			for (var dim in temp) {
	// 				temp[dim].selStart = temp[dim].tileStart;
	// 				temp[dim].selEnd =  temp[dim].tileEnd;
	// 				temp[dim].relStart = temp[dim].selStart - temp[dim].tileStart;
	// 				temp[dim].relEnd = temp[dim].selEnd - temp[dim].tileStart;
	// 			}
	// 		}
	// 		console.log(d, temp);
	// 	}
	// },
	
	getDataTiles : function(){
		return this.get("dataTiles");
	},

	getDataTileIds : function(){
		return this.get("dataTileIds");
	},
	
	getNumDataTile : function(){
		// return Object.keys( this.get("dataTiles") ).length;
		return this.get("dataTiles").length;
	},
	
	getFirstDataTileId : function(){
		return this.get("dataTileIds")[0];
		// for(var key in this.get("dataTiles")) break;
		// return  key ;
	},
	
	getFirstDataTile : function(){
		// for(var key in this.get("dataTiles")) break;
		// return  this.get("dataTiles")[key] ;
		return this.get("dataTiles")[0];
	},
	
	getDataTileDimensionality : function(){
		// for(var key in this.get("dataTiles")) break;
		// return Object.keys( this.get("dataTiles")[key] ).length;
		return Object.keys(this.get("dataTiles")[0]).length;
	},
	
	toString : function(){
		var dims = this.get("mdi").getDimensionKeys();
		var s = "";
		for (var i = 0; i < dims.length; i++){
			s += this.get("mdi").getDimInfo(dims[i]).toString() + "x";
		}
		return s.substring(0,s.length-1);
	},
	
	getMultiDimInfo: function(){
		return this.get("mdi");
	},
	
	getDimensionInfo : function(k){
		return this.get("mdi").getDimInfo(dim);
	},
	
	initialize : function() {
		this.set("mdi", new MultiDimInfo);
	},
	
	defaults : function() {
		return {
		};
	},
	
});