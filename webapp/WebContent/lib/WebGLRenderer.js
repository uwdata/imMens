var WebGLRenderer = Backbone.Model.extend({
	
	/**
	 * @memberOf WebGLRenderer
	 */
	run : function(excludedSpecs){
		
		if (Object.keys(this.get("binnedPlots").get("visSpecs")).length == 0)	return;
		
		var gl = this.get("gl");
		
		var visSpecs = this.get("binnedPlots").get("visSpecs");
		if (!this.get("program")) {
			this.set("program", this.createProgram(gl));
		}
		
		gl.useProgram( this.get("program") );

		var processor = this.get("processor");
		var rollupTexture;
		if (processor.has("resultImg")){
			rollupTexture = processor.get("resultImg");
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, null); 
			gl.bindTexture(gl.TEXTURE_2D, rollupTexture); 
		}
		else {
		}
		
		this.clear();
		for (var s in visSpecs){
			
			if (excludedSpecs && excludedSpecs.indexOf(visSpecs[s]) >= 0)	continue;
			this.setVisualTileParameters(visSpecs[s]);
			
			//draw GEO plots on the foreground
			if (visSpecs[s].get("type") == VisSpec.GEO  && this.isBg())	continue;
			
			//for 1D plots & 2D scatterplot, do not draw on foreground when there's no filter
			if (!this.isBg() && !this.get("binnedPlots").get("brushFilter") && visSpecs[s].get("type")!=VisSpec.GEO)	continue;
			
			this.paint(gl, visSpecs[s], processor);
		}
	},
	
	paint : function(gl, vSpec, processor){
		var w = this.get("binnedPlots").get("width");
		var h = this.get("binnedPlots").get("height");
		gl.viewport(0, 0, w, h);
		
		var vTile;
		var visPos = vSpec.getVisPosition();
		var xPos = visPos.x;
		var yPos = vSpec.get("yFromTop");
		var x, y;
		for (var vTileId in vSpec.get("visualTiles")){
			vTile = vSpec.get("visualTiles")[vTileId];
			
			if (vTile.getNumDataTile() == 0)	continue;
			
			this.setProgramParameters(gl, vTile, processor, vSpec, 0.5, 0.5);
			
			x = xPos + vTile.get("containerX");
			y = h - yPos - vTile.get("containerY");

			this.drawPart(gl, (x )*2/w, (y )*2/h, 
							(x + vTile.get("visibleWidth") )*2/w, 
							(y - vTile.get("visibleHeight") )*2/h, 
							w, h );
		}
		if (this.isBg() && vSpec.get("type") != VisSpec.GEO){
			this.drawAxis(vSpec);
			this.updateScrollBar(vSpec);
		}
			
	},
	
	getOrdinalScale : function (col, size, spec){
		var colIdx = spec.get("cols").indexOf(col);
		var binCnts = dataManager.get("metadata")[ col ].binsPerTile;
		var totalBinCnt = dataManager.get("metadata")[ col ].totalBinCnt[spec.get("zmLevels")[colIdx]];
		var domainValues = [];
		var ticks = [];
		var sBin = spec.get("startBins")[colIdx], eBin = spec.get("endBins")[colIdx];
		var sBinLbl = undefined, eBinLbl = undefined;

		var numTicks = Math.ceil( binCnts/(size/20) );
		for (var a = sBin; a <= eBin; a++){
			var lbl = dataManager.get("metadata")[ col ].binNames[a];
			if (!lbl)	continue;
			if (sBinLbl == undefined)
				sBinLbl = a;
			eBinLbl = a;
			domainValues.push(lbl);
			if (a%numTicks == 0)
				ticks.push(lbl);
		}

		
		var rangeStart = (sBinLbl - sBin) * spec.get("pixPerBin")[colIdx], 
			rangeEnd = (eBinLbl - sBin + 1) * spec.get("pixPerBin")[colIdx];

		// 	rangeStart + (eBin - sBin + 1) * spec.get("pixPerBin")[colIdx];
		// if (rangeStart < 0){
		// 	//rangeEnd = rangeStart + size;
		// 	rangeStart = 0;
		// }
		// if (rangeEnd > size)
		// 	rangeEnd = Math.ceil(size/spec.get("pixPerBin")[colIdx])*spec.get("pixPerBin")[colIdx];
		// else 
		// 	rangeEnd = Math.ceil(size/spec.get("pixPerBin")[colIdx])*spec.get("pixPerBin")[colIdx];

		var scale = d3.scale.ordinal().domain(domainValues).rangeBands([rangeStart, rangeEnd]);
		// if (spec.get("type") == VisSpec.BAR)
		// 	console.log(sBin, eBin, rangeStart, rangeEnd, domainValues);
		scale.temp = ticks;
		return scale;
	},
	
	getLinearScale : function (col, size, isDimension, spec, reverse){
		var scale;
		if (isDimension){
			var idx = spec.get("cols").indexOf( col );
			var globalStartV =  dataManager.get("metadata")[ col ].binStartValue;
			var startV = globalStartV + spec.get("startBins")[idx] * dataManager.get("metadata")[ col ].binWidth[spec.get("zmLevels")[idx]];
			var endV = globalStartV + spec.get("endBins")[idx] * dataManager.get("metadata")[ col ].binWidth[spec.get("zmLevels")[idx]];
			// if (VisManager.useLog){
			// 	startV = Math.log(startV+1.0);
			// 	endV = Math.log(endV+1.0);
			// }
			scale = d3.scale.linear().domain([startV,endV]);
		}
		else {
			var processor = this.get("processor");
			var maxAggr = this.get("binnedPlots").get("rollupStats")[ processor.getBinTexIdx( spec.get("cols") ) ][0] * 255 ;
			if (VisManager.useLog){
				scale = d3.scale.log().base([Math.E]).domain([1.0,maxAggr+1.0]);//d3.scale.linear().domain([Math.log(1.0),Math.log(maxAggr+1.0)]);	
			} else
				scale = d3.scale.linear().domain([0,maxAggr]);	
		}
		if (reverse)
			scale.range([size,0]);
		else
			scale.range([0,size]);
		return scale;
	},

	updateScrollBar : function(spec){
		if (spec.get("type") == VisSpec.SP){
			var cols = spec.get("cols");
			var xMeta = dataManager.get("metadata")[cols[0]];
			var yMeta = dataManager.get("metadata")[cols[1]];
			var xStartBin = spec.get("startBins")[0] < 0 ? 0 : spec.get("startBins")[0];
			var xEndBin = spec.get("endBins")[0] > xMeta.totalBinCnt[spec.get("zmLevels")[0]] - 1? xMeta.totalBinCnt[spec.get("zmLevels")[0]] - 1 : spec.get("endBins")[0];
			var yStartBin = spec.get("startBins")[1] < 0 ? 0 : spec.get("startBins")[1];
			var yEndBin = spec.get("endBins")[1] > yMeta.totalBinCnt[spec.get("zmLevels")[1]] - 1? yMeta.totalBinCnt[spec.get("zmLevels")[1]] - 1 : spec.get("endBins")[1];
			var hWd = spec.getVisSize().wd * (xEndBin - xStartBin + 1)/xMeta.totalBinCnt[spec.get("zmLevels")[0]];
			var vHt = spec.getVisSize().ht * (yEndBin - yStartBin + 1)/yMeta.totalBinCnt[spec.get("zmLevels")[1]];
			var hPos = spec.getVisPosition().x + spec.getVisSize().wd * xStartBin/xMeta.totalBinCnt[spec.get("zmLevels")[0]];
			var vPos = spec.get("yFromTop") + spec.getVisSize().ht * (1 - yEndBin/yMeta.totalBinCnt[spec.get("zmLevels")[1]]);
			d3.select("#"+spec.getHorizontalScrollBarID()).attr("x", hPos).attr("width", hWd);
			d3.select("#"+spec.getVerticalScrollBarID()).attr("y", vPos).attr("height", vHt);
		}
	},
	
	drawAxis : function (spec){
		
		var numberFormat = d3.format(",.2s");
		function logFormat(d) {
				var x = Math.log(d) / Math.log(Math.E) + 1e-6;
				return Math.floor(x/4) == 0 ? numberFormat(d) : ""; 
		  		//return Math.abs(x - Math.floor(x)) < .7 ? numberFormat(d) : "";
		}
		var r, c;
		var cols = spec.get("cols");
		r = cols[0];
		c = cols.length > 1 ? cols[1] : cols[0]; 
		
		var xScale, yScale;
		var visSize = spec.getVisSize();
		if (spec.get("type") == VisSpec.HIST){
			if (dataManager.get("metadata")[ r ].dType == DataManager.dataTypes.categorical)
				xScale = this.getOrdinalScale(r, visSize.wd, spec);
			else
				xScale = this.getLinearScale(r, visSize.wd, true, spec);
			yScale = this.getLinearScale(r, visSize.ht, false, spec, true);
			
			var xAxis = d3.svg.axis().orient("bottom").scale(xScale).tickValues(xScale.temp).tickSize(6, 3, 0);
			d3.select("#"+spec.getAxisDOMId(true)).call(xAxis);
			var yAxis = d3.svg.axis().orient("left").scale(yScale).tickFormat(d3.format(" ,.2s")).ticks(5);
			d3.select("#"+spec.getAxisDOMId(false)).call(yAxis);
		}
		else if (spec.get("type") == VisSpec.BAR){
			if (dataManager.get("metadata")[ r ].dType == DataManager.dataTypes.categorical)
				yScale = this.getOrdinalScale(r, visSize.ht, spec);
			else
				yScale = this.getLinearScale(r, visSize.ht, false, spec);
			xScale = this.getLinearScale(r, visSize.wd, false, spec);
			


			var xAxis = d3.svg.axis().orient("bottom").scale(xScale).tickFormat(d3.format(" ,.2s")).ticks(3);
			if (VisManager.useLog){
				d3.select("#"+spec.getAxisDOMId(true)).call(xAxis).selectAll("text")  
	            .attr("transform", function(d) {
	            	var halfWd = this.getBBox().width/2;
			        return "rotate(-60, " + parseInt(this.getBBox().x + halfWd) + "," +
			        parseInt(this.getBBox().y + this.getBBox().height/2) + ")translate(-" + halfWd + ",0)";
			    });
			}
				
			d3.select("#"+spec.getAxisDOMId(true)).call(xAxis);
			var yAxis = d3.svg.axis().orient("left").scale(yScale).tickSize(6, 3, 0);;//.ticks(5);
			d3.select("#"+spec.getAxisDOMId(false)).call(yAxis);
		}
		else {
			var xAxis, yAxis, rotateX = false;
			if (dataManager.get("metadata")[ r ].dType == DataManager.dataTypes.categorical){
				xScale = this.getOrdinalScale(r, visSize.wd, spec);
				xAxis = d3.svg.axis().orient("bottom").scale(xScale).tickSize(6, 3, 0);;
				rotateX = true;
			}
			else {
				xScale = this.getLinearScale(r, visSize.wd, true, spec);
				xAxis = d3.svg.axis().orient("bottom").scale(xScale).tickFormat(d3.format(" ,.2s")).ticks(5);
			}
				
			if (dataManager.get("metadata")[ c ].dType == DataManager.dataTypes.categorical){
				yScale = this.getOrdinalScale(c, visSize.ht, spec);
				yAxis = d3.svg.axis().orient("left").scale(yScale).tickSize(6, 3, 0);;
			}	
			else {
				yScale = this.getLinearScale(c, visSize.ht, true, spec, true);
				yAxis = d3.svg.axis().orient("left").scale(yScale).tickFormat(d3.format(" ,.2s")).ticks(5);
			}
				
			if (rotateX) {
				d3.select("#"+spec.getAxisDOMId(true)).call(xAxis).selectAll("text")  
	            .attr("transform", function(d) {
	            	var halfWd = this.getBBox().width/2;
			        return "rotate(-65, " + parseInt(this.getBBox().x + halfWd) + "," +
			        parseInt(this.getBBox().y + this.getBBox().height/2) + ")translate(-" + halfWd + ",0)";
			    });
			}
			else
				d3.select("#"+spec.getAxisDOMId(true)).call(xAxis);
			d3.select("#"+spec.getAxisDOMId(false)).call(yAxis);
		}
	},
	
	setProgramParameters : function(gl, vTile, processor, vSpec, loColor, hiColor ){
		var prog = this.get("program");
		var topleftAbsPix;
		
		if (vSpec.get("type") ==  VisSpec.GEO){
			var map = vSpec.get("bgmap");
			topleftAbsPix = map.containerPointToLayerPoint([0,0]).add(map.getPixelOrigin()) ;
		}
		else if (vSpec.get("cols").length == 1){
			topleftAbsPix = {x : vSpec.get("startBins")[0] * vSpec.get("pixPerBin")[0], y: 0};
		}
		else {
			topleftAbsPix = {x : vSpec.get("startBins")[0] * vSpec.get("pixPerBin")[0], 
								y: vSpec.get("startBins")[1] * vSpec.get("pixPerBin")[1]};
		}
		
		var cols = vSpec.get("cols");
		var rollupTexture = processor.get("resultImg");
		var rollupStats = this.get("binnedPlots").get("rollupStats")[processor.getBinTexIdx(cols)];
		
		var xPos = vSpec.getVisPosition().x;
		var yPos = vSpec.get("yFromTop");
		gl.uniform1f(prog.visXPos, xPos);
		gl.uniform1f(prog.visYPos, yPos);
		
		gl.uniform1f(prog.xLoc,  vTile.getIdx() * vSpec.get("fboWidthPerVTile") );	
		gl.uniform1f(prog.yLoc,  processor.getYPosOnFBO(vSpec));	
		gl.uniform1i(prog.isBg, this.isBg());
		gl.uniform1i(prog.useLog, VisManager.useLog);
		gl.uniform1i(prog.texture, 0);
		gl.uniform1f(prog.visType, vSpec.get("type"));
		
		gl.uniform1f(prog.plotsHt, this.get("binnedPlots").get("height") );
		gl.uniform1f(prog.exp, this.get("alpha_exp"));
		
		gl.uniform1f(prog.bufferMax, rollupStats[0]);
		gl.uniform1f(prog.bufferMin, rollupStats[2]);
		gl.uniform1f(prog.avgPix, rollupStats[1]);
		
		gl.uniform1f(prog.visibleTileWd, vTile.get("visibleWidth"));
		gl.uniform1f(prog.visibleTileHt, vTile.get("visibleHeight"));
		gl.uniform1f(prog.xBinPixWd, vSpec.get("pixPerBin")[0]);
		gl.uniform1f(prog.yBinPixWd, vSpec.get("cols").length > 1 ? vSpec.get("pixPerBin")[1] : vSpec.get("pixPerBin")[0]);
		gl.uniform1f(prog.textureWd, rollupTexture.width);
		gl.uniform1f(prog.textureHt, rollupTexture.height);
		gl.uniform1f(prog.visWd, vSpec.getVisSize().wd);
		gl.uniform1f(prog.visTileWd, dataManager.get("metadata")[cols[0]].binsPerTile * vSpec.get("pixPerBin")[0]);
		
		

		gl.uniform2f(prog.pixOffsets, vTile.get("xOffsetPix"), vTile.get("yOffsetPix"));
		gl.uniform2f(prog.containerPos, vTile.get("containerX"),   vTile.get("containerY") );
		// gl.uniform1f(prog.loV, rollupStats[2]);
		// gl.uniform1f(prog.hiV, rollupStats[0]);
		gl.uniform1f(prog.hiV, WebGLRenderer.bufferMax);
		gl.uniform1f(prog.loV, WebGLRenderer.bufferMin);
		
		gl.uniform2f(prog.pixOrigin, topleftAbsPix.x, topleftAbsPix.y);
		
		if (cols.length > 1){
			var binSize = dataManager.get("metadata")[ cols[1] ].binsPerTile;
			var pixPerBin = vSpec.get("pixPerBin")[1];
			//gl.uniform1f(prog.visTileSize, binSize * pixPerBin);
			gl.uniform1f(prog.visTileHt, binSize * pixPerBin);
		
			gl.uniform2f(prog.cols, cols[0], cols[1] );
			gl.uniform1i(prog.yIsTopBtm, dataManager.get("metadata")[cols[1]].dType != 2);
			
			gl.uniform2f(prog.binCnts, dataManager.get("metadata")[ cols[0] ].binsPerTile, 
					dataManager.get("metadata")[ cols[1] ].binsPerTile  );
		} else {
			gl.uniform2f(prog.cols, cols[0], cols[0] );
			var binCntPerTile = dataManager.get("metadata")[ cols[0] ].binsPerTile;
			
			gl.uniform1f(prog.oneDPlotHt, vSpec.getVisSize().ht);
			gl.uniform1f(prog.histGap, vSpec.get("histGap"));
			
			// gl.uniform1f(prog.visTileSize, dataManager.get("metadata")[cols[0]].totalBinCnt[vSpec.get("zmLevels")[0]]/binCntPerTile <= 1 ?
			// 		vSpec.getVisSize().wd : binCntPerTile * vSpec.get("pixPerBin")[0] );
			
			var color = this.isBg()? this.get("bg_histColor") : this.get("fg_histColor");
			gl.uniform3f(prog.histColor, color[0], color[1], color[2]);
			gl.uniform2f(prog.binCnts, dataManager.get("metadata")[ cols[0] ].binsPerTile, 
					dataManager.get("metadata")[ cols[0] ].binsPerTile  );
		}
	},
	
	setVisualTileParameters : function(vSpec){
		var xCol, yCol, xPixPerBin, yPixPerBin, xZm, yZm;
		var swAbsPix, neAbsPix;
		var pixPerBin = vSpec.get("pixPerBin");
		var visSize = vSpec.getVisSize();
		
		if (vSpec.get("cols").length == 1){
			xCol = vSpec.get("cols")[0];
			yCol = vSpec.get("cols")[0];
			xZm = vSpec.get("zmLevels")[0];
			yZm = vSpec.get("zmLevels")[0];
			xPixPerBin = pixPerBin[0];
			yPixPerBin = xPixPerBin;
			swAbsPix = {x: vSpec.get("startBins")[0] * xPixPerBin, y: 0};
			neAbsPix = {x: vSpec.get("startBins")[0] * xPixPerBin + visSize.wd, y: 0};
		}
		else if (vSpec.get("type") == VisSpec.GEO){
			xCol = vSpec.get("cols")[0];
			yCol = vSpec.get("cols")[1];
			xPixPerBin = pixPerBin[0];
			yPixPerBin = pixPerBin[1];
			xZm = vSpec.get("zmLevels")[0];
			yZm = vSpec.get("zmLevels")[1];
			var sBins = vSpec.get("startBins"), eBins = vSpec.get("endBins");
			swAbsPix = {x: sBins[0] * xPixPerBin, y: eBins[1]*yPixPerBin};
			neAbsPix = {x: eBins[0] * xPixPerBin, y: sBins[1]*yPixPerBin};
		}
		else {
			xCol = vSpec.get("cols")[0];
			yCol = vSpec.get("cols")[1];
			xZm = vSpec.get("zmLevels")[0];
			yZm = vSpec.get("zmLevels")[1];
			xPixPerBin = pixPerBin[0];
			yPixPerBin = pixPerBin[1];
			// swAbsPix = { x: vSpec.get("startBins")[0] * xPixPerBin, 
			// 			y: vSpec.get("startBins")[1] * yPixPerBin + visSize.ht };
			// neAbsPix = { x: vSpec.get("startBins")[0] * xPixPerBin + visSize.wd,
			// 			y: vSpec.get("startBins")[1] * yPixPerBin };
			var sBins = vSpec.get("startBins"), eBins = vSpec.get("endBins");
			swAbsPix = {x: sBins[0] * xPixPerBin, y: sBins[1]*yPixPerBin};
			neAbsPix = {x: eBins[0] * xPixPerBin, y: eBins[1]*yPixPerBin};
		}
		
		var tileXBinCnt = dataManager.get("metadata")[xCol].binsPerTile;
		var tileYBinCnt = dataManager.get("metadata")[yCol].binsPerTile;
	
		var visTileWidth, visTileHeight;
		var xTotalBinCnt = dataManager.get("metadata")[xCol].totalBinCnt[xZm];
		var xBinCntPerTile = dataManager.get("metadata")[xCol].binsPerTile;
		var yTotalBinCnt = dataManager.get("metadata")[yCol].totalBinCnt[yZm];
		var yBinCntPerTile = dataManager.get("metadata")[yCol].binsPerTile; 
		

		// if (xTotalBinCnt/xBinCntPerTile <= 1 && vSpec.get("cols").length == 1)//( (vSpec.get("endBins")[0] - vSpec.get("startBins")[0] + 1) >= xBinCntPerTile )
		// 	visTileWidth = visSize.wd;
		// else
		// 	visTileWidth = tileXBinCnt * xPixPerBin;
		
		// if (yTotalBinCnt/yBinCntPerTile <= 1 && vSpec.get("cols").length == 1) //( (vSpec.get("endBins")[1] - vSpec.get("startBins")[1] + 1) >= yBinCntPerTile )
		// 	visTileHeight = visSize.ht;
		// else
		// 	visTileHeight = tileYBinCnt * yPixPerBin;
		
		var vTile, vTileDimInfos, tileLeft, tileTop;
		for (var vTileId in vSpec.get("visualTiles")){
			vTile = vSpec.get("visualTiles")[vTileId];
			vTileDimInfos = vTile.getMultiDimInfo();

			//containerX: x coord of topleft corner of visible part of the tile wrp to the container
			//xOffsetPix: x coord of the topleft corner of visible part of the tile wrp to the tile
			//visWidth: visible width of the tile inside the map
			//containerY: y coord of topleft corner of visible part of the tile wrp to the container
			//yOffsetPix: y coord of the topleft corner of visible part of the tile wrp to the tile
			//visHeight: visible height of the tile inside the map
			
			// tileLeft = Math.floor( vTileDimInfos.getDimInfo(xCol).getStartBin()/tileXBinCnt ) * tileXBinCnt;
			// tileTop = vSpec.get("type") == VisSpec.SP? Math.floor( vTileDimInfos.getDimInfo(yCol).getEndBin()/tileYBinCnt ) * tileYBinCnt
			// 			: Math.floor( vTileDimInfos.getDimInfo(yCol).getStartBin()/tileYBinCnt ) * tileYBinCnt;
			//vTile.set("visWidth", visTileWidth - vTile.get("xOffsetPix"));

			if (vSpec.get("type") == VisSpec.HIST){
				// vTile.set("visibleHeight", visTileHeight - vTile.get("yOffsetPix"));
				// vTile.set("containerY", vSpec.get("type") == VisSpec.SP ? neAbsPix.y - tileTop * yPixPerBin : tileTop * yPixPerBin - neAbsPix.y);
				// vTile.set("yOffsetPix", 0);
				// vTile.set("visibleHeight", visTileHeight);
				
				// if (vTile.get("containerY") < 0){
				// 	vTile.set("visibleHeight", visTileHeight + vTile.get("containerY"));
				// 	vTile.set("containerY", 0);
				// 	vTile.set("yOffsetPix", visTileHeight - vTile.get("visibleHeight"));
				// }
				// else if (vTile.get("containerY") + visTileHeight > visSize.ht )	
				// 	vTile.set("visibleHeight",  visTileHeight - (vTile.get("containerY") + visTileHeight - visSize.ht));
				vTile.set("visibleHeight", visSize.ht);
				vTile.set("containerY", 0);
				vTile.set("yOffsetPix", 0);
			} else if (vSpec.get("type") == VisSpec.BAR){
				vTile.set("visibleWidth", visSize.wd);
				vTile.set("containerX", 0);
				vTile.set("xOffsetPix", 0);
			}

			// if (vSpec.get("cols").length==1)
			// 	console.log(vTileId, vTile.get("visibleWidth"), vTile.get("containerX"), vTile.get("xOffsetPix"),
			// 						vTile.get("visibleHeight"), vTile.get("containerY"), vTile.get("yOffsetPix"));
			
		}
		
	},
	
	
	
	createProgram : function(gl){
		
		var p  = gl.createProgram();
		gl.attachShader(p, Shaders.getVertexShader(gl));
		
		gl.attachShader(p, Shaders.getRenderShader_4Byte(gl) );
//							packing4bytes? Shaders.getGeoRenderShader_4Bytes(gl) 
//									: Shaders.getGeoRenderShader_1Byte(gl));
							//: shaders.getIdentityFragmentShader(gl));
		gl.linkProgram(p);
		
		p.textureWd = gl.getUniformLocation(p, "u_texw");	
		p.textureHt = gl.getUniformLocation(p, "u_texh");		
		p.texture = gl.getUniformLocation(p, "u_data");
		p.visTileWd = gl.getUniformLocation(p,"u_visTileWd");
		p.visTileHt = gl.getUniformLocation(p,"u_visTileHt");
		p.visibleTileWd = gl.getUniformLocation(p,"u_visibleTileWd");
		p.visibleTileHt = gl.getUniformLocation(p,"u_visibleTileHt");
		p.visXPos = gl.getUniformLocation(p,"u_visXPos");
		p.visYPos = gl.getUniformLocation(p, "u_visYPos");
		p.binCnts = gl.getUniformLocation(p, "u_binCnts");
		p.xBinPixWd = gl.getUniformLocation(p, "u_xBinPixWd");
		p.yBinPixWd = gl.getUniformLocation(p, "u_yBinPixWd");
		p.cols = gl.getUniformLocation(p, "u_cols");
		p.xLoc = gl.getUniformLocation(p,"u_xLoc");
		p.yLoc = gl.getUniformLocation(p,"u_yLoc");
		p.isBg = gl.getUniformLocation(p,"u_isBg");
		p.yIsTopBtm = gl.getUniformLocation(p, "u_yIsTopBtm");
		p.isInvert = gl.getUniformLocation(p,"u_isInvert");
		p.useLog = gl.getUniformLocation(p, "u_useLog");
		
		p.histGap = gl.getUniformLocation(p, "u_histGap");
		p.exp = gl.getUniformLocation(p, "u_exp");
		//p.visTileSize = gl.getUniformLocation(p, "u_tileSize");
		p.bufferMax = gl.getUniformLocation(p, "u_bufferMax");
		p.bufferMin = gl.getUniformLocation(p, "u_bufferMin");
		p.avgPix = gl.getUniformLocation(p,"u_avgPix");
		p.visWd = gl.getUniformLocation(p, "u_canvasWd");
		p.plotsHt = gl.getUniformLocation(p, "u_plotsHt");
		p.oneDPlotHt = gl.getUniformLocation(p, "u_1dPlotHt");
		//p.canvasHt = gl.getUniformLocation(p, "u_canvasHt");
		p.pixOffsets = gl.getUniformLocation(p, "u_pixOffsets");
		p.texIdx = gl.getUniformLocation(p,"u_texIdx");
		p.containerPos = gl.getUniformLocation(p,"u_containerPos");

		p.pixOrigin = gl.getUniformLocation(p,"u_pixOrigin");
		p.zm = gl.getUniformLocation(p,"u_zm");		

        p.transformation = gl.getUniformLocation(p,"u_trans");

		p.loV = gl.getUniformLocation(p, "u_loV" );
		p.hiV = gl.getUniformLocation(p, "u_hiV" );
		p.histColor = gl.getUniformLocation(p, "u_histColor" );
		//p.expParam = gl.getUniformLocation(p, "u_exp");
		
		p.visType = gl.getUniformLocation(p,"u_visType");
		
		return p;
		
	},
	
	drawPart : function(gl, x1, y1, x2, y2, wd, ht){
		
		var prog = this.get("program");
		var positionLocation = gl.getAttribLocation(prog, "a_position");
		var buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(
			gl.ARRAY_BUFFER, 
			new Float32Array([
				-1.0+x1, -1.0+y1, 
				-1.0+x2, -1.0+y1, 
				-1.0+x1,  -1.0+y2, 
				-1.0+x1,  -1.0+y2, 
				 -1.0+x2, -1.0+y1, 
				 -1.0+x2,  -1.0+y2]), 
			gl.STATIC_DRAW);
		gl.enableVertexAttribArray(positionLocation);
		gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
		gl.clearColor(0.0, 0.0, 0.0, 0.0);
		//gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
		// draw
		gl.drawArrays(gl.TRIANGLES, 0, 6);
		//gl.flush();
	},
	
	isBg : function(){
		return this.get("isBg");
	},
	
	clear : function(){
		var gl = this.get("gl");
		gl.clearColor(0.0, 0.0, 0.0, 0.0);                      // Set clear color to black, fully opaque  
		gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);      // Clear the color as well as the depth buffer.
	},
	
	initialize : function() {
		this.set("alpha_exp", 0.33);
		this.set("bg_histColor", [0.27, 0.51, 0.71]);
		this.set("fg_histColor", [1.0, 0.647, 0.0]);
		this.set("bg_barColor", [0.702, 0.859, 1.0]); //[0.8, 0.906, 1.0]);
		this.set("fg_barColor", [1.0, 0.72, 0.302]);
		this.set("loColors", d3.scale.linear().domain([0, 1]).range([d3.rgb(255,255,204), d3.rgb(255,255,0)]));
		this.set("hiColors", d3.scale.linear().domain([0, 1]).range([d3.rgb(255,102,153), d3.rgb(204,0,0)]));
	},
}, {
	bufferMin : 0,
	bufferMax : 0,
});