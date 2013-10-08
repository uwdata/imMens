var VisSpec = Backbone.Model.extend({
		
	/**
	 * @memberOf VisSpec
	 */
	defaults : function() {
		return {
		};
	},
	
	getNumVisualTiles : function() {
		return Object.keys( this.get("visualTiles") ).length;
	}, 

	pixToBin : function(pixInVis, colIdx, isX) {
		var col = this.get("cols")[colIdx];
		if (isX){
			var temp = this.get("startBins")[colIdx] + Math.floor(pixInVis/this.get("pixPerBin")[colIdx]);
			var totalXBinCnt = dataManager.get("metadata")[col].totalBinCnt[this.get("zmLevels")[colIdx]];
			while (temp < 0) {
				temp += totalXBinCnt;
			} 
			while (temp > totalXBinCnt - 1) {
				temp -= totalXBinCnt;
			} 
			return temp;
		} else if (dataManager.get("metadata")[col].dType == DataManager.dataTypes.numerical) {
			return this.get("startBins")[colIdx] + Math.floor((this.getVisSize().ht - pixInVis)/this.get("pixPerBin")[colIdx]);
		} else {
			return this.get("startBins")[colIdx] + Math.floor(pixInVis/this.get("pixPerBin")[colIdx]);
		}
	},
	
	getVisualTileRanges : function(colIdx) {
		var tileRanges = [];
		var cols = this.get("cols");
		var vSize = this.getVisSize();
		var binCnt = dataManager.get("metadata")[cols[colIdx]].totalBinCnt[this.get("zmLevels")[colIdx]];
		var binCntPerTile = dataManager.get("metadata")[cols[colIdx]].binsPerTile;
		var startBin = Math.floor(this.get("startBins")[colIdx]/binCntPerTile) * binCntPerTile;
		var endBin = this.get("startBins")[colIdx] + vSize.wd/this.get("pixPerBin")[colIdx] - 1;
		
		if (binCnt/binCntPerTile <= 1) {
			tileRanges[0] = startBin;
			tileRanges[1] = startBin + binCntPerTile - 1;
		} else {
			tileRanges[0] = startBin;
			while (startBin < endBin) {
				tileRanges[1] = startBin + binCntPerTile - 1;
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
	
	resetVisualTiles : function() {
		
		var xTiles = [], yTiles = [];
		var cols = this.get("cols");
		var vSize = this.getVisSize();
		
		var startBin = this.get("startBins")[0];
		var xBinCnt = dataManager.get("metadata")[cols[0]].totalBinCnt[this.get("zmLevels")[0]];
		var xBinCntPerTile = dataManager.get("metadata")[cols[0]].binsPerTile;
		var xPixRange = this.get("type") == VisSpec.BAR ? vSize.ht : vSize.wd;
		var xEndBin = this.get("startBins")[0] + xPixRange/this.get("pixPerBin")[0];
		if (xEndBin > xBinCnt - 1 && this.get("type") != VisSpec.GEO)
			xEndBin = xBinCnt - 1;
		var xTilePixWd = xBinCntPerTile * this.get("pixPerBin")[0];
		
		var tileXPix = 0;
		// if (xBinCnt/xBinCntPerTile < 1) {
		// 	xTiles.push( [startBin, startBin + xBinCntPerTile - 1, this.get("zmLevels")[0], 0, 0]);
		// } else {
			while (startBin < xEndBin) {
				var visibleTileWd = (xBinCntPerTile * ( Math.floor(startBin/xBinCntPerTile) + 1 ) - startBin) * this.get("pixPerBin")[0];
				xTiles.push([startBin,  xBinCntPerTile * ( Math.floor(startBin/xBinCntPerTile) + 1 ) - 1, 
				             this.get("zmLevels")[0], tileXPix, xTilePixWd - visibleTileWd, visibleTileWd]);
				tileXPix += visibleTileWd;
				
				if (xBinCntPerTile * ( Math.floor(startBin/xBinCntPerTile) + 1 )  >= xBinCnt && this.get("type") == VisSpec.GEO) {
					startBin = 0;
					xEndBin -= xBinCnt;
				} else {
					startBin = xBinCntPerTile * (Math.floor(startBin/xBinCntPerTile) + 1);
				}
			}
		// }
		// if (cols[0] == 2)
		// 	console.log(xTiles);
		
		if (this.get("startBins").length > 1) {
			startBin = this.get("startBins")[1];
			
			var yBinCnt = dataManager.get("metadata")[cols[1]].totalBinCnt[this.get("zmLevels")[1]];
			var yBinCntPerTile = dataManager.get("metadata")[cols[1]].binsPerTile;
			var yEndBin = this.get("startBins")[1] + vSize.ht/this.get("pixPerBin")[1];
			var yTilePixHt = yBinCntPerTile * this.get("pixPerBin")[1];

			
			var tileYPix = 0;
			if (yBinCnt/yBinCntPerTile < 1) {
				yTiles.push([startBin, startBin + yBinCntPerTile - 1, this.get("zmLevels")[1]]);
			} else {				
				while (startBin < this.get("startBins")[1] + vSize.ht/this.get("pixPerBin")[1]){
					var tileEndBin = yBinCntPerTile * (Math.floor(startBin/yBinCntPerTile) + 1) - 1;
					var visibleTileEndBin = yBinCntPerTile * (Math.floor(startBin/yBinCntPerTile) + 1) - 1;
					if (visibleTileEndBin > this.get("endBins")[1])
					 	visibleTileEndBin = this.get("endBins")[1];

					var visibleTileHt = (visibleTileEndBin - startBin + 1) * this.get("pixPerBin")[1];
					var tileHtFromStartBin = (tileEndBin - startBin + 1) * this.get("pixPerBin")[1];
					var containerY, yOffsetPix;
					if (this.get("type") == VisSpec.SP){
						containerY = vSize.ht - visibleTileHt - tileYPix;
						if (containerY < 0)	containerY = 0;
						yOffsetPix = tileHtFromStartBin - visibleTileHt;
						//yOffsetPix = (yBinCntPerTile * (Math.floor(startBin/yBinCntPerTile) + 1) - tileEndBin) * this.get("pixPerBin")[1];
						//console.log(containerY, yOffsetPix, visibleTileHt);
					} else {
						containerY = tileYPix;
						yOffsetPix = yTilePixHt - tileHtFromStartBin;
					}
					yTiles.push([startBin, visibleTileEndBin, this.get("zmLevels")[1], containerY, yOffsetPix, visibleTileHt]);

					tileYPix += visibleTileHt;
					startBin = yBinCntPerTile * (Math.floor(startBin/yBinCntPerTile) + 1);
				}
			}
		}
		
		this.set("visualTiles", {});
		var vTile;
		var count = 0;
		for (var i = 0; i < xTiles.length; i++) {
			var id = cols[0] + "-" + xTiles[i][0] + "-" + xTiles[i][1] + "-" + xTiles[i][2];
			if (yTiles.length == 0) {
				vTile = new VisualTile;
				//vTile.set("spec", this);
				vTile.addDimension(cols[0], xTiles[i][2], xTiles[i][0], xTiles[i][1]);
				vTile.setIdx(count++);
				vTile.set("containerX", xTiles[i][3]);
				vTile.set("xOffsetPix", xTiles[i][4]);
				vTile.set("visibleWidth", xTiles[i][5]);
				this.get("visualTiles")[id] = vTile;
			} else {
				var id2;
				for (var j = 0; j < yTiles.length; j++) {
					id2 = id + "x" + cols[1] + "-" + yTiles[j][0] + "-" + yTiles[j][1] + "-" + yTiles[j][2];
					vTile = new VisualTile;
					//vTile.set("spec", this);
					vTile.setIdx(count++);
					vTile.set("containerX", xTiles[i][3]);
					vTile.set("xOffsetPix", xTiles[i][4]);
					vTile.set("containerY", yTiles[j][3]);
					vTile.set("yOffsetPix", yTiles[j][4]);
					vTile.set("visibleHeight", yTiles[j][5]);
					vTile.addDimension(cols[0], xTiles[i][2], xTiles[i][0], xTiles[i][1]);
					vTile.addDimension(cols[1], yTiles[j][2], yTiles[j][0], yTiles[j][1]);
					this.get("visualTiles")[id2] = vTile;
				}
			}	
		}
	},
	
	generateZoomingAdjacentTiles : function(tileId){
		
		var mdi = DataUtil.parseTileId(tileId);
		var dimensions = mdi.getDimensionKeys();
		var toFetch = [];
		var meta = dataManager.get("metadata");
		
		var generate = function(tileInfo, dims, dimIdx, soFar, result){
			if (dimIdx == dims.length - 1){
				var dim = dims[dimIdx];
				var startBin = tileInfo.getDimInfo(dim).getStartBin()*2;
				var binCntPerTile = meta[dim].binsPerTile;

				while(startBin < tileInfo.getDimInfo(dim).getEndBin()*2) {
					result.push(soFar + "x" + dim + "-" 
							+ startBin + "-" 
							+ parseInt(startBin + binCntPerTile - 1) + "-" 
							+ parseInt(tileInfo.getDimInfo(dim).getZoom()+1) );
					startBin += binCntPerTile;
				}
				
				startBin = tileInfo.getDimInfo(dim).getStartBin()/2;
				result.push(soFar + "x" + dim + "-" 
						+ startBin + "-" 
						+ parseInt(startBin + binCntPerTile - 1) + "-" 
						+ parseInt(tileInfo.getDimInfo(dim).getZoom()-1) );
				return;
			}
			else {
				var starter = dimIdx == 0 ? soFar : soFar + "x";
				var dim = dims[dimIdx];
				var startBin = tileInfo.getDimInfo(dim).getStartBin()*2;
				var binCntPerTile = meta[dim].binsPerTile;
				
				while(startBin < tileInfo.getDimInfo(dim).getEndBin()*2) {
					var nextLevel = starter + dim + "-" 
							+ startBin + "-" 
							+ parseInt(startBin + binCntPerTile - 1) + "-" 
							+ parseInt(tileInfo.getDimInfo(dim).getZoom()+1);
					startBin += binCntPerTile;
					generate (tileInfo, dims, dimIdx + 1, nextLevel, result);
				}
				
				startBin = tileInfo.getDimInfo(dim).getStartBin()/2;;
				var previousLevel = starter + dim + "-" 
						+ startBin + "-" 
						+ parseInt(startBin + binCntPerTile - 1) + "-" 
						+ parseInt(tileInfo.getDimInfo(dim).getZoom()-1);
				generate(tileInfo, dims, dimIdx + 1, previousLevel, result);
				
			}
		}; // end of recursive function
		
		generate(mdi, dimensions, 0, "", toFetch);
		return toFetch;
	},
	
	//if activeSpec is null, returns essentially visual tiles
	//example result: {"2-0-11-0": ["2-0-11-0x3-0-30-0"]}
	getRequiredDataTilesForBrush : function(brushFilter, isBg){
		var vTiles = this.get("visualTiles");
		var obj = {};
		
		for (var vTileId in vTiles){
			vTile = vTiles[vTileId];
			var mdi = vTile.getMultiDimInfo().shallowCopy();

			if(brushFilter){
				//var cols = activeSpec.get("cols");
				for (var a in brushFilter){
					if (mdi.hasDimension(a))
						continue;
					mdi.addDimension(brushFilter[a]);
				}
			}
			// if (isBg && mainVisSpec && mainVisSpec != this && mainVisSpec.get("zmLevels")[0] > 2){
			// 	var cols = mainVisSpec.get("cols");
			// 	var tempDimInfo;
			// 	for (var a = 0; a < cols.length; a++){
			// 		if (mdi.hasDimension(cols[a]))
			// 			continue;
					
			// 		tempDimInfo = new DimInfo;
			// 		tempDimInfo.setInfo(cols[a], mainVisSpec.get("zmLevels")[a], 
			// 					mainVisSpec.get("startBins")[a], mainVisSpec.get("endBins")[a]);
			// 		mdi.addDimension(tempDimInfo);
			// 	}
			// }
			
			obj[vTileId] = mdi.getRequiredDataTiles();
		}//for each visual tile
		return obj;
	},

	getRequiredDataTilesForSpec: function(activeSpec){
		var vTiles = this.get("visualTiles");
		var obj = {};
		
		for (var vTileId in vTiles){
			vTile = vTiles[vTileId];
			var mdi = vTile.getMultiDimInfo().shallowCopy();

			if(activeSpec && activeSpec != this){
				var cols = activeSpec.get("cols");
				var tempDimInfo;
				for (var a = 0; a < cols.length; a++){
					if (mdi.hasDimension(cols[a]))
						continue;
					
					tempDimInfo = new DimInfo;
					tempDimInfo.setInfo(cols[a], activeSpec.get("zmLevels")[a], 
								activeSpec.get("startBins")[a], activeSpec.get("endBins")[a]);
					mdi.addDimension(tempDimInfo);
				}
			}
			obj[vTileId] = mdi.getRequiredDataTiles();
		}//for each visual tile
		return obj;
	},
	
	toString : function() {
		var type;
		switch(this.get("type")){
		case 0:
			type = "hist";
			break;
		case 1:
			type = "area";
			break;
		case 2:
			type = "scatterplot";
			break;
		case 3:
			type = "geo";
			break;
		case 4:
			type = "bar";
			break;
		case 5:
			type = "line";
			break;
		}
		return type + "-" + this.getSpecId(); 
	},
	
	zoomSP : function(change){
		var spec = this;
		return function(){
			var cols = spec.get("cols");
			var maxZm = d3.max(Object.keys(dataManager.get("metadata")[cols[0]].totalBinCnt));
			var minZm = d3.min(Object.keys(dataManager.get("metadata")[cols[1]].totalBinCnt));
			var zm = spec.get("zmLevels")[0];
			if (zm + change <= maxZm && zm + change >= minZm){
				spec.set("zmLevels", [zm + change, zm + change]);
				spec.updateSPBins(0,0);
				var event = new ImMensEvent;
				event.setParam (ImMensEvent.evtTypes.zoom, spec, zm + change);
				visManager.fireEvent(event);
			}
			zm = spec.get("zmLevels")[0];
			if (zm == maxZm)
				d3.select("#"+spec.getZoomInControlID()).style("display", "block"); //.attr("class", "sp-zoom-in-disabled");
			else
				d3.select("#"+spec.getZoomInControlID()).style("display", "none"); //.attr("class", "sp-zoom-in-enabled");
			if (zm == minZm)
				d3.select("#"+spec.getZoomOutControlID()).style("display", "block"); //.attr("class", "sp-zoom-out-disabled");
			else
				d3.select("#"+spec.getZoomOutControlID()).style("display", "none"); //.attr("class", "sp-zoom-out-enabled");
		};
	},

	getState : function() {
		var type;
		switch(this.get("type")){
		case 0:
			type = "hist";
			break;
		case 1:
			type = "area";
			break;
		case 2:
			type = "scatterplot";
			break;
		case 3:
			type = "geo";
			break;
		case 4:
			type = "bar";
			break;
		case 5:
			type = "line";
			break;
		}
		var s = "[" + type + ":";
		for (var i = 0; i < this.get("cols").length; i++){
			s += [this.get("cols")[i], this.get("startBins")[i], this.get("endBins")[i], this.get("zmLevels")[i]].join("-");
			if (i < this.get("cols").length - 1)
				s += "x";
		}
		return s + "]"; 
	},

	initialize : function() {
	},
	
	getFirstVisualTile : function() {
		for(var key in this.get("visualTiles")) break;
		return  this.get("visualTiles")[key] ;
	},
	
	//for geomaps
	getBinBounds : function() {
		var map = this.get("bgmap");
		var pixPerBin = this.get("pixPerBin");
		
		var swAbsPix = map.containerPointToLayerPoint([0, this.getVisSize().ht]).add(map.getPixelOrigin()) ;
		var neAbsPix = map.containerPointToLayerPoint([this.getVisSize().wd, 0]).add(map.getPixelOrigin()) ;
		
		return{ latStart: Math.floor(neAbsPix.y/pixPerBin[0]), latEnd: Math.ceil(swAbsPix.y/pixPerBin[0]), 
				lngStart: Math.floor(swAbsPix.x/pixPerBin[1]), lngEnd: Math.ceil(neAbsPix.x/pixPerBin[1]) };
	},
	
	updateGeoBins : function() {
		//{min: L.Point, max: L.Point}
		//L.Point {x: 1292, y: 1865}
		var ppb = this.get("pixPerBin");
		var visSize = this.getVisSize();
		
		var map = this.get("bgmap");

		var bounds = this.get("bgmap").getPixelBounds();
		var sBins = [Math.floor(bounds.min.x/ppb[0]), Math.floor(bounds.min.y/ppb[1])];
		var eBins = [Math.floor(bounds.max.x/ppb[0])-1, Math.floor(bounds.max.y/ppb[1])-1];
		var cols = this.get("cols");
		var totalXBinCnt = dataManager.get("metadata")[cols[0]].totalBinCnt[this.get("zmLevels")[0]];
		var totalYBinCnt = dataManager.get("metadata")[cols[1]].totalBinCnt[this.get("zmLevels")[1]];
		
		while (sBins[0] < 0) {
			sBins[0] += totalXBinCnt;
		} 
		while (sBins[0] > totalXBinCnt - 1) {
			sBins[0] -= totalXBinCnt;
		} 
		while (eBins[0] < 0) {
			eBins[0] += totalXBinCnt;
		}  
		while (eBins[0] > totalXBinCnt - 1) {
			eBins[0] -=  totalXBinCnt;
		}
		
		this.set("startBins", sBins);
		this.set("endBins", eBins);
	},

	//xDiff, yDiff is in terms of bins
	updateBins : function(xDiff, yDiff, commitChanges){
		var ppb = this.get("pixPerBin");
		var visSize = this.getVisSize();
		var cols = this.get("cols");
		var xColMeta = dataManager.get("metadata")[cols[0]];
		// var xbinWidths = dataManager.get("metadata")[cols[0]].binWidth;
		// var ybinWidths = dataManager.get("metadata")[cols[0]].binWidth;
		// var centerBins = [ Math.floor((this.get("center")[0] + xDiff - xColMeta.binStartValue)/xColMeta.binWidth[this.get("zmLevels")[0]]),
		// 				   Math.floor((this.get("center")[1] + yDiff - yColMeta.binStartValue)/yColMeta.binWidth[this.get("zmLevels")[1]])];
		// var sBins = [ centerBins[0] - Math.floor(visSize.wd/(2*ppb[0]))];
		// var eBins = [ centerBins[0] + Math.floor(visSize.wd/(2*ppb[0]) - 1) ];
		var sBins = [this.get("dfltStartBins")[0] + xDiff];
		var pixRange = this.get("type") == VisSpec.BAR ? visSize.ht : visSize.wd;
		var eBins = [sBins[0] + Math.floor(pixRange/ppb[0]) - 1 ];
		if (eBins[0] > xColMeta.totalBinCnt[this.get("zmLevels")[0]] - 1)
			eBins[0] = xColMeta.totalBinCnt[this.get("zmLevels")[0]] - 1;

		if (cols.length == 2){
			var yColMeta = dataManager.get("metadata")[cols[1]];
			// sBins.push( centerBins[1] - Math.floor(visSize.ht/(2*ppb[1])) );
			// eBins.push( centerBins[1] + Math.floor(visSize.ht/(2*ppb[1]) - 1) );
			sBins.push(this.get("dfltStartBins")[1] + yDiff);
			eBins.push(sBins[1] + Math.floor(visSize.ht/ppb[1]) - 1);
			if (eBins[1] > yColMeta.totalBinCnt[this.get("zmLevels")[1]] - 1)
			eBins[1] = yColMeta.totalBinCnt[this.get("zmLevels")[1]] - 1;
		}

		this.set("startBins", sBins);
		this.set("endBins", eBins);
		if (commitChanges){
			//this.set("center", [this.get("center")[0] + xDiff, this.get("center")[1] + yDiff]);
			this.set("dfltStartBins", sBins.map(function(d,i){return d;}));
		}
	},
	
	getSpecId : function() {
		var cols = this.get("cols");
		if (cols.length == 1)
			return cols[0];
		else 
			return cols[0]+"-"+cols[1];

	},
	
	getPlaceHolderSize : function() {
		return {
				wd : this.get("phDfltWd") + this.get("deltaX"),
				ht : this.get("phDfltHt") + this.get("deltaY"),
				};
	},
	
	getPlaceHolderPosition : function() {
		return {
				x : this.get("phx"),
				y : this.get("phy"),
				};
	},
	
	getVisSize : function() {
		var phSize = this.getPlaceHolderSize();
		
		if (this.get("type") == VisSpec.GEO){
			return {
				wd : phSize.wd ,
				ht : phSize.ht ,
				};
		}
		else {
			return {
				wd : phSize.wd - VisSpec.yAxisWd - this.getYAxisLblSize() - VisSpec.rightMargin,
				ht : phSize.ht - VisSpec.xAxisHt - this.getXAxisLblSize() - VisSpec.topMargin,
				};
		}
	},
	
	//y is from the bottom of canvas
	getVisPosition : function() {
		var visSize = this.getVisSize();
		if (this.get("type") == VisSpec.GEO){
			return {
				x : this.get("phx") ,
				y : visManager.get("plotHeight") - this.get("yFromTop") - visSize.ht,
			};
		} else {
			return {
				x : this.get("phx") + VisSpec.yAxisWd + this.getYAxisLblSize(),
				y : visManager.get("plotHeight") - this.get("yFromTop") - visSize.ht,
			};
		}
	},
	
	getAxisDOMId: function(isX) {
		return isX? this.cid + "-x" : this.cid + "-y";
	},
	
	getZoomInControlID : function(){
		return "zoom-in-" + this.getSpecId();
	},

	getZoomOutControlID : function(){
		return "zoom-out-" + this.getSpecId();
	},

	getHorizontalScrollBarID : function(){
		return "hscroll-" + this.getSpecId();
	},

	getVerticalScrollBarID : function(){
		return "vscroll-" + this.getSpecId();
	},

	getYAxisLblSize: function() {
		if (this.get("type") == VisSpec.HIST)
			return 0;
		else
			return VisSpec.labelSize;
	},
	
	getXAxisLblSize: function() {
		if (this.get("type") == VisSpec.BAR)
			return 0;
		else
			return VisSpec.labelSize;
	},
	
	// updatePixPerBin: function() {
	// 	var visSize = this.getVisSize();
		
	// 	if (this.get("cols").length == 1) {
	// 		var width = this.get("type") == VisSpec.BAR ? visSize.ht : visSize.wd;
	// 		this.set("pixPerBin", [width/(this.get("endBins")[0] - this.get("startBins")[0] + 1) ]);
	// 		if (this.get("pixPerBin")[0] > 15 ){
	// 			this.set("histGap", Math.floor(this.get("pixPerBin")[0] - 13) );
	// 		}
	// 		else if (this.get("pixPerBin")[0] < VisSpec.minBarSize){
	// 			this.set("pixPerBin", [VisSpec.minBarSize]);
	// 			//this.set("endBins", [colmeta["binStartValue"] + Math.floor(width/VisSpec.minBarSize)]);
	// 			this.set("endBins", [this.get("startBins")[0] + Math.floor(width/VisSpec.minBarSize)]);
	// 			this.set("histGap", 1.0 );
	// 		} 
	// 		else
	// 			this.set("histGap", 1.0 );
	// 	} else {
	// 		this.set("pixPerBin", [visSize.wd/(this.get("endBins")[0] - this.get("startBins")[0] + 1),
	// 		                       visSize.ht/(this.get("endBins")[1] - this.get("startBins")[1] + 1),
	// 		                       ]);
	// 	}
	// },
	
	updateFBOSize : function() {
		var cols = this.get("cols");
		var fboWidthPerTile = dataManager.get("metadata")[cols[0]].binsPerTile;
		if (cols.length > 1 && dataManager.get("metadata")[cols[1]].binsPerTile > fboWidthPerTile)
			fboWidthPerTile = dataManager.get("metadata")[cols[1]].binsPerTile;
		//height allocated to this spec on the fbo image
		var fboHeight = cols.length == 1 ? 1 : fboWidthPerTile;
		
		this.set("fboWidthPerVTile", fboWidthPerTile );
		this.set("fboHeight", fboHeight );
	},
	
	updateLabelLoc : function() {
		var visSize = this.getVisSize();
		var visPos = this.getVisPosition();
		var plPos = this.getPlaceHolderPosition();
		
		if (this.get("type") == VisSpec.BAR) {
			this.set({
				labelLoc: [[plPos.x + 15, 
				            plPos.y + 10]]
			});
		} else if (this.get("type") == VisSpec.HIST) {
			this.set({
				labelLoc: [[visPos.x + visSize.wd/3, 
				            this.get("yFromTop") + visSize.ht + VisSpec.xAxisHt]]
			});
		} else if (this.get("type") == VisSpec.SP) {
			this.set({
				labelLoc: [
				           [visPos.x +  visSize.wd/3, 
				            this.get("yFromTop") + visSize.ht + VisSpec.xAxisHt],
							[plPos.x + 15, 
							 plPos.y + 10]
						  ]
			});
		}
	}
	
}, {
	HIST : 0,
	AREA : 1,
	SP : 2,
	GEO : 3,
	BAR : 4,
	LINE: 5,
	xAxisHt: 25,
	yAxisWd: 50,
	labelSize: 25,
	defaultWd: 450,
	defaultHt: 320,
	defaultGap: 25,
	minBarSize: 10.0,
	scrollBarSize: 7,
	maxBarSize: 16.0,
	minCellSize: 3,
	maxCellSize: 10.0,
	topMargin: 10,
	rightMargin: 10,
	resize: {wd: 0, ht: 1, both: 2, none: 3}
});