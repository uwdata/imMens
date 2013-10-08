var WebGLGeoProcessor = Backbone.Model.extend({
	
	/**
	 * @memberOf WebGLGeoProcessor
	 */
	run : function(){
		
		var gl = this.get("gl");
		
		//convert the relevant data tiles for computing the projection/range-query 
		var tileTexs = this.createTileTextures(gl);
		
		//create image to store the query results
		var latCol = this.get("latCol");
		//var lngCol = this.get("lngCol");
		var binSize = dataManager.get("metadata")[latCol].binsPerTile; //this is assuming index of the metadata array are the column indices, might change
		
		if (!this.has("resultImg")){
			var numTiles = tileTexs.length;

			var tex = DataUtil.createTexture(gl, binSize , DataUtil.logCeil(binSize * numTiles , 2)  );
			tex.width = binSize;
			tex.height = DataUtil.logCeil(binSize * numTiles , 2) ;
			this.set("resultImg", tex);
		}
		
		if (!this.has("program")){
			var bufferProg = this.createQueryProgram(gl, true, false);
			gl.useProgram(bufferProg);
			this.set("program", bufferProg);
		}
		
		
		this.bindTextures(gl, tileTexs);
		this.rollup(gl, tileTexs);
		//this.visualizeFBO(tileTexs);
	},
	
	visualizeFBO : function(tileTexs){
		
		var rollupTexture = this.get("resultImg");
		
//		if (d3.select("#fbo").empty()){
//			d3.select("body").append("canvas").attr("id", "fbo")
//				.attr("width",rollupTexture.width).attr("height",rollupTexture.height)
//				.attr("style", "position: absolute; left: 710 px; top: 20 px;")
//				;
//		}
		
		var fboGL =   this.get("gl"); //document.getElementById("fbo").getContext("experimental-webgl", { depth: false, preserveDrawingBuffer: true });
		
		var p  = fboGL.createProgram();
		fboGL.attachShader(p, Shaders.getVertexShader(fboGL));
		fboGL.attachShader(p, Shaders.getIdentityFragmentShader(fboGL)); 

		fboGL.linkProgram(p);
		
		p.textureWd = fboGL.getUniformLocation(p, "u_texw");	
		p.textureHt = fboGL.getUniformLocation(p, "u_texh");		
		p.texture = fboGL.getUniformLocation(p, "u_data");
		p.visWd = fboGL.getUniformLocation(p,"u_visWd");
		p.visHt = fboGL.getUniformLocation(p,"u_visHt");
		p.tileSize = fboGL.getUniformLocation(p,"u_tileSize");
		p.yLoc = fboGL.getUniformLocation(p,"u_yLoc");
		
		
		
		fboGL.bindFramebuffer(fboGL.FRAMEBUFFER, null);
		fboGL.activeTexture(fboGL.TEXTURE0);
		fboGL.bindTexture(fboGL.TEXTURE_2D, null); 
		fboGL.bindTexture(fboGL.TEXTURE_2D, rollupTexture); 
		fboGL.clearColor(0.0, 0.0, 0.0, 0.0);                      // Set clear color to black, fully opaque  
		fboGL.clear(fboGL.COLOR_BUFFER_BIT|fboGL.DEPTH_BUFFER_BIT);      // Clear the color as well as the depth buffer.
		
		fboGL.useProgram(p);
		
		var dTile, texIdx;
		var tileIdxLookup = this.get("tileIdxLookup");
		for (var i = 0; i < tileTexs.length; i++){
			dTile = tileTexs[i];
			texIdx = tileIdxLookup[dTile.id];
			fboGL.uniform1i(p.texture, 0);
			fboGL.uniform1f(p.visWd, rollupTexture.width);
			fboGL.uniform1f(p.visHt,  rollupTexture.height );
			
			fboGL.uniform1f(p.textureWd, rollupTexture.width);
			fboGL.uniform1f(p.textureHt, rollupTexture.height);
			fboGL.uniform1f(p.yLoc, texIdx * 256);
			fboGL.uniform1f(p.tileSize, 256);
			
			this.drawPart(fboGL, p, 0, texIdx * 256 * 2 / rollupTexture.height, 
					2, (texIdx + 1) * 256 * 2 / rollupTexture.height, 
					rollupTexture.width, rollupTexture.height  );
		}
		
		
		
	},
	
	computeMax : function(gl, packing4bytes){
		
		var rollupTexture = this.get("resultImg");
		
		var w = rollupTexture.width;
		var h = rollupTexture.height;
		var pix = new Uint8Array( w * h *4);
		gl.readPixels(0, 0, w, h, gl.RGBA,gl.UNSIGNED_BYTE, pix);
		
		this.set("rollupResult", pix);

		var max = 0, min = 1000;
		var s = 0;
		var v;
		
		var dict = {};

		for (var i = 0; i < w * h * 4; i+=4){
			
			if (packing4bytes){
				v = pix[i] * Math.pow(2, 24) + pix[i+1] * Math.pow(2,16) + pix[i+2] * Math.pow(2,8) + pix[i+3];	
			} else {
				v = pix[i];
			}
			s += v;
			if (v > max )
				max = v;
			if (v < min && v > 0.003 * 255) //&& v > 0.003 * 255
				min = v;

			if (dict.hasOwnProperty(v))
				dict[v]++;
			else
				dict[v] = 1;
			
		}
		
		//console.log(dict);
		//console.log(s, max, min);
		//c.putImageData(img,rollupTexture.width,rollupTexture.height);
		//Canvas2Image.saveAsBMP(cv);
		//console.log(s/(binCnts[latCol]*binCnts[lngCol]));

		return [max/(255.0), s/(w * h * 255.0 ), min/255.0];	
	},
	
	getRollupResult : function(){
		return this.get("rollupResult");
	},
	
	getRollupSummary : function(){
		return this.get("rollupStat");
	}, 
	
	bindTextures : function(gl, tileTexs){
		var rttFramebuffer = this.get("rttFrameBuffer");
		
		gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer);

		//var numTiles = Object.keys(dataTiles).length;
		//console.log(numTiles);

		var rollupTexture = this.get("resultImg");
		//console.log(rollupTexture);
		
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rollupTexture, 0);
		
		
		var tex;
		for (var c = 0; c < tileTexs.length; c++){
			tex = tileTexs[c];
			gl.activeTexture(gl.TEXTURE0 + c);
			gl.bindTexture(gl.TEXTURE_2D, null); 
			gl.bindTexture(gl.TEXTURE_2D, tex); 
			
			this.get("tileIdxLookup")[tex.id] = c;
			
		}
		
		
		
		
	},
	
	rollup : function(gl, dataTiles){
		
		var rollupTexture = this.get("resultImg");
		var tileIdxLookup = this.get("tileIdxLookup");
		//clear the buffer image
		gl.clearColor(0.0, 0.0, 0.0, 0.0);                      // Set clear color to black, fully opaque  
		gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);      // Clear the color as well as the depth buffer.
		
		gl.viewport(0, 0, rollupTexture.width, rollupTexture.height);
		
		var tile;
		var latCol = this.get("latCol");
		var binSize = dataManager.get("metadata")[latCol].binsPerTile;
		var prog = this.get("program");
		
		//console.log(dataTiles);
		for (var i = 0; i < dataTiles.length; i++) {
			
			tile = dataTiles[i];
			
			
			this.setProgramParameters(gl, tile, true);
			//gl.uniform1i(bufferProg.texture, tile.texIdx);
			//console.log(tile);
			this.drawPart(gl, prog, 0, tileIdxLookup[tile.id] * binSize * 2 / rollupTexture.height, 
							2, (tileIdxLookup[tile.id] + 1) * binSize  * 2 / rollupTexture.height, 
							rollupTexture.width, rollupTexture.height );
			//console.log( tile.texIdx * binSize * 2 / rollupTexture.height,  ((tile.texIdx + 1) * binSize - 1) * 2 / rollupTexture.height );
		}
		
		//find out the maximum value
		var stat = this.computeMax(gl, false);
		//console.log(stat);
		this.set("rollupStat", stat);
		
//		if (!filters || filters.length == 0) {
//			var stat = computeMaxPix();
//			maxBufferPix = stat[0];
//			avgBufferPix = stat[1];
//			minBufferPix = stat[2];
//		}
	},
	
	drawPart: function(gl, prog, x1, y1, x2, y2, wd, ht){
		
		//var prog = this.get("program");
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
	
	setProgramParameters : function(gl, dataTile, is3D){
		
		var prog = this.get("program");
		var latCol = this.get("latCol");
		var lngCol = this.get("lngCol");
		var tileIdxLookup = this.get("tileIdxLookup");
		var binSize = dataManager.get("metadata")[latCol].binsPerTile;
		var rollupTexture = this.get("resultImg");
		var texIdx = tileIdxLookup[dataTile.id];
		
		gl.uniform1i(prog.texture, texIdx);
		//console.log(dataTile.texIdx);
		gl.uniform1f(prog.visWd, binSize);
		gl.uniform1f(prog.visHt,  rollupTexture.height );
		
		gl.uniform1f(prog.textureWd, dataTile.width);
		gl.uniform1f(prog.textureHt, dataTile.height);
		//console.log(dataTile.texWidth, dataTile.texHeight);
		//gl.uniform2f(bufferProg.binOffsets, latBinsPerPix, lngBinsPerPix  );
		gl.uniform1f(prog.yLoc, texIdx * binSize);
		//console.log(dataTile.id, dataTile.texIdx * binSize);
		//console.log(tile.texIdx * tileSize);
		gl.uniform1f(prog.max, this.get("maxPixSum") );
		//gl.uniform1f(bufferProg.max, tile.pixSum );
		//gl.uniform1f(bufferProg.localMax, tile.dataMax);
		//gl.uniform1f(bufferProg.globalMax, dataMax);
		//console.log(tile.dataSum/maxDataSum);
		//console.log("pixsum" + tile.pixSum);
		
		//console.log(dataTile.meta[latCol].start, dataTile.meta[lngCol].start, dataTile.texIdx * binSize);
		
		var cols = [], binCnts = [];
		for (var i in dataTile.meta){
			cols.push(parseInt( dataTile.meta[i].dim ));
			binCnts.push( dataTile.meta[i].end - dataTile.meta[i].start + 1 );
		}
		//console.log(cols, binCnts);
		
		var lo = is3D? [0,0,0] : [0,0,0,0];
		var hi = binCnts; //is3D? [binCnts[0], binCnts[1], binCnts[2]] : [ binCnts[0], binCnts[1], binCnts[2], binCnts[3] ];
		
		//filters: [ x2BinIdx: 1, xBinIdx: 0, xCol: 2, y2BinIdx: NaN, yBinIdx: undefined, yCol: 2 ]
		var geoHeatmap = this.get("geoHeatmap");
		var brushFilter = geoHeatmap.getBrushFilter();
		if(brushFilter){
			//now just asssuming there is one dimension defined in the filter, e.g. brushing a histogram
			var rangeSelection = brushFilter[0];
			
			lo[cols.indexOf(rangeSelection.get("x").col)] = rangeSelection.get("x").start;
			hi[cols.indexOf(rangeSelection.get("x").col)] = rangeSelection.get("x").end;
			
			if (rangeSelection.has("y")) {
				lo[cols.indexOf(rangeSelection.get("y").col)] = rangeSelection.get("y").start;
				hi[cols.indexOf(rangeSelection.get("y").col)] = rangeSelection.get("y").end;
			}
		}
		
		//console.log(lo, hi);

		if (is3D) {
			gl.uniform3f(prog.lo, lo[0], lo[1], lo[2]);
			gl.uniform3f(prog.cols, cols[0], cols[1], cols[2] );
			gl.uniform3f(prog.hi, hi[0], hi[1], hi[2] );
			gl.uniform3f(prog.binOffsets, 1, binCnts[0], binCnts[0] * binCnts[1] );
			gl.uniform3f(prog.binCnts, binCnts[0], binCnts[1], binCnts[2]  );
		}
		else {
			gl.uniform4f(prog.lo, lo[0], lo[1], lo[2], lo[3]);
			gl.uniform4f(prog.cols, cols[0], cols[1], cols[2], cols[3] );
			gl.uniform4f(prog.hi,  hi[0], hi[1], hi[2] , hi[3] );
			gl.uniform4f(prog.binOffsets, 1, binCnts[0], binCnts[0] * binCnts[1], binCnts[0] * binCnts[1] * binCnts[2] );
			gl.uniform4f(prog.binCnts, binCnts[0], binCnts[1], binCnts[2], binCnts[3]  );
		}
	},
	
	createTileTextures : function(gl){
		
		var geoHeatmap = this.get("geoHeatmap");
		var maxPixSum = 0;
		
		
		var tiles = geoHeatmap.get("dataTiles");
		//console.log(tiles);
		
		//convert the tiles to img textures
		
		var tileTexs = []; 
		var tex, tile;
		
		//var c = 0;
		//console.log("processor");
		for (var i = 0; i < tiles.length; i++){
			tile = tiles[i];
			
			tex = DataUtil.createTexture(gl, tile.width, tile.height, tile );
			tex.meta = tile.meta;
			tex.dataSum = tile.dataSum;
			tex.id = tile.id;

			tex.width = tile.width;
			tex.height = tile.height;				
			tex.pixMax = tile.pixMax;
			tex.pixSum = tile.pixSum;
			
			
			tileTexs.push(tex);
			
			
			//console.log(tiles[i]);
			//c++;
			
			if (tiles[i].pixSum > maxPixSum)
				maxPixSum = tiles[i].pixSum;
		}
		this.set("maxPixSum", maxPixSum);
		//console.log(maxPixSum);
		
		this.set("dataTileTextures", tileTexs);
		return tileTexs;
		//dataManager.getTiles([1,2,0], [4,0,4], [1020, 0, 24], [1578,11,35]);
	},
	
	getDataTileTextures : function(){
		return this.get("dataTileTextures");
	},
	
	createQueryProgram : function(gl, is3D, packing4bytes){
		var p  = gl.createProgram();
		gl.attachShader(p, Shaders.getVertexShader(gl));
		
		gl.attachShader(p, is3D? 
								packing4bytes? 
										Shaders.getQueryShader3D_4Bytes(gl) 
								: Shaders.getQueryShader3D_1Byte(gl)  
							: Shaders.getGeoHeatmapBufferFragmentShader4D(gl)); 

							//: shaders.getIdentityFragmentShader(gl));
		gl.linkProgram(p);
		
		p.textureWd = gl.getUniformLocation(p, "u_texw");	
		//p.textureHt = gl.getUniformLocation(p, "u_texh");		
		p.texture = gl.getUniformLocation(p, "u_data");
		p.visWd = gl.getUniformLocation(p,"u_visWd");
		p.visHt = gl.getUniformLocation(p,"u_visHt");
		p.binCnts = gl.getUniformLocation(p, "u_binCnts");
		p.cols = gl.getUniformLocation(p, "u_cols");
		p.yLoc = gl.getUniformLocation(p,"u_yLoc");
		//p.localMax = gl.getUniformLocation(p,"u_localMax");
        //p.globalMax = gl.getUniformLocation(p,"u_globalMax");
		
		//p.mapBound = gl.getUniformLocation(p, "u_mapBinIdxBound");
		p.binOffsets = gl.getUniformLocation(p, "u_offsets");
		p.lo = gl.getUniformLocation(p, "u_lo");
		p.hi = gl.getUniformLocation(p, "u_hi");
		p.max = gl.getUniformLocation(p,"u_max");
			
		return p;
	},
	
	defaults : function() {
		return {
		};
	},

	
	initialize : function() {
		var gl = this.get("gl");
		
		if (!this.get("rttFrameBuffer")) {
			this.set({
				rttFrameBuffer : gl.createFramebuffer(),
				tileIdxLookup : {}
			});
		}
	},
	
});