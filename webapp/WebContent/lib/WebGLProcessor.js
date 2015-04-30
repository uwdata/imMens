var WebGLProcessor = Backbone.Model.extend({
		
	/**
	 * @memberOf WebGLProcessor
	 */
	run : function(){
		
		//var t1 = Date.now();
		if (Object.keys(this.get("binnedPlots").get("visSpecs")).length == 0)	return;
		
		
		var gl = this.get("gl");
		
		//var buffer = isBg? "bgFB" : "fgFB";
		if (!this.get("frameBuffer")) {
			
			this.set({
				frameBuffer : gl.createFramebuffer(),
				//tileIdxLookup : {}
			});
		}
		
		this.createTileTextures(gl);
		this.bindTextures(gl, this.get("frameBuffer"));
		
		if (!this.get("program3D")) {
			this.set("program3D", this.createProgram(gl, true, false) );
		}
		
		this.rollup(gl);
		this.unbindTexture(gl);
	},
	
	processVisualTile : function(gl, visualTile, vSpec){
		
		if ( visualTile.getNumDataTile() == 0 )
			return;
		
		var numDim = visualTile.getDataTileDimensionality();
		
		var prog = numDim < 4? this.get("program3D") : this.get("program4D") ;
		gl.useProgram(prog);
    	
    	var h = vSpec.get("fboHeight") ;
    	var x0 = visualTile.getIdx();

    	this.setProgramParameters(gl, prog, visualTile, vSpec);
		
    	var binTexYPos = this.get("binYLoc");
    	var cols = vSpec.get("cols");
		var binIdx = this.getBinTexIdx(cols);
		
		var fboImg = this.get("resultImg");
		var binTexWd = fboImg.width;
    	var binTexHt = fboImg.height;
    	gl.viewport(0, 0, fboImg.width, fboImg.height);
    	
    	this.drawPart(prog,  gl, x0 * vSpec.get("fboWidthPerVTile") * 2/binTexWd,  binTexYPos[binIdx]*2/binTexHt, 
    			(x0 + 1) * vSpec.get("fboWidthPerVTile") * 2/binTexWd, (binTexYPos[binIdx]+h)*2/binTexHt, 
				binTexWd, binTexHt );
    	
	},
	
	rollup : function(gl){
		this.clear();
		var visSpecs = this.get("binnedPlots").get("visSpecs");
		var spec;
		for (var s in visSpecs){
			spec = visSpecs[s];
			if (this.isBg() && spec.get("type") == VisSpec.GEO)	continue;
			for (var vTileId in spec.get("visualTiles")){
				this.processVisualTile (gl, spec.get("visualTiles")[vTileId], spec );
			}
		}
		
		
		if (!this.isBg())	return;
		
		for (var s in visSpecs){
			var cols = visSpecs[s].get("cols");
			var binIdx = this.getBinTexIdx(cols);
			
			this.get("binnedPlots").get("rollupStats")[binIdx] =  this.computeMaxPix(gl, visSpecs[s]);
			//console.log(visSpecs[s].toString(), this.get("binnedPlots").get("rollupStats")[binIdx]);
			
			if (visSpecs[s].get("cols").length == 2  ){
				actionManager.updateRangeSlider( this.get("binnedPlots").get("rollupStats")[binIdx][2] * 255,
						this.get("binnedPlots").get("rollupStats")[binIdx][0] * 255);
				WebGLRenderer.bufferMin = this.get("binnedPlots").get("rollupStats")[binIdx][2];
				WebGLRenderer.bufferMax = this.get("binnedPlots").get("rollupStats")[binIdx][0];
			}
		}
	},
	
	computeMaxPix : function(gl, spec){
		
		if (this.getGlobalMaxProj(spec)){
			return [this.getGlobalMaxProj(spec)/255.0, undefined, this.getGlobalMinProj(spec)/255.0];
		}
		
		var w, h;
		var cols = spec.get("cols");
		if (cols.length == 1){
			w = spec.get("fboWidthPerVTile") * spec.getNumVisualTiles(); //dataManager.get("metadata")[ cols[0] ].binsPerTile;
			h = 1;
		}
		else {
			w = spec.get("fboWidthPerVTile") * spec.getNumVisualTiles();
			h = spec.get("fboHeight");
		}

		var pix = new Uint8Array(w*h*4);
		
		var binTexYPos = this.get("binYLoc");
    	var binIdx = this.getBinTexIdx( cols );
		
		gl.readPixels(0, binTexYPos[binIdx], w, h, gl.RGBA,gl.UNSIGNED_BYTE, pix);
		
		var max = 0, min = 1000, s= 0;
		var v;
		
		var heatmap = [];

		for (var i = 0; i < w * h * 4; i+=4){
			v = pix[i+3] * Math.pow(2, 24) + pix[i+2] * Math.pow(2,16) + pix[i+1] * Math.pow(2,8) + pix[i];	
			heatmap.push(v);
			s += v;
			if (v > max )
				max = v;
			if (v < min && v > 0.003 * 255) //&& v > 0.003 * 255
				min = v;
		}
		return [max/(255.0), s/(w * h * 255.0 ), min/255.0];
	},
	
	
	drawPart: function(prog, gl, x1, y1, x2, y2, wd, ht){
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
	},
	
	getYPosOnFBO : function (vSpec){
		var cols = vSpec.get("cols");
		var idx = this.getBinTexIdx(cols);
		return this.get("binYLoc")[ idx ];
	},
	
	getGlobalMaxProj : function(spec) {
		var vTile = spec.getFirstVisualTile();
		var dTile = this.get("binnedPlots").get("allTiles")[vTile.getFirstDataTileId()];
		if (dTile && dTile.globalMaxProj)
			return dTile.globalMaxProj[spec.get("cols").join("x")];
		else
			return undefined;
	},
	
	getGlobalMinProj : function(spec) {
		var vTile = spec.getFirstVisualTile();
		var dTile = this.get("binnedPlots").get("allTiles")[vTile.getFirstDataTileId()];
		if (dTile && dTile.globalMinProj)
			return dTile.globalMinProj[spec.get("cols").join("x")];
		else
			return undefined;
	},
	
	setProgramParameters : function(gl, currentProgram, visTile, visSpec){
		var cols = visSpec.get("cols");
		var idx = this.getBinTexIdx(cols);
		
		//assuming all tiles need to draw this vis have same dimensions/zoom levels
		var tileCols = [];
		var binCnts = [];
		
		var dataTile = this.get("binnedPlots").get("allTiles")[visTile.getFirstDataTileId()];
		
		for (var i in dataTile.meta){
			tileCols.push(parseInt( dataTile.meta[i].dim ));
			binCnts.push( dataTile.meta[i].end - dataTile.meta[i].start + 1 );
		}

    	gl.uniform2f(currentProgram.cols, tileCols.indexOf(cols[0]), cols.length == 1 ? tileCols.indexOf(cols[0]) : tileCols.indexOf(cols[1]) );
    	gl.uniform4f(currentProgram.binCnts, binCnts[0], binCnts[1], binCnts[2], 
				tileCols.length < 4 ? 0: binCnts[3]);
    	
    	gl.uniform1f(currentProgram.binXPos,  visTile.getIdx() * visSpec.get("fboWidthPerVTile") );
    	gl.uniform1f(currentProgram.binYPos,  this.get("binYLoc")[ idx ] );
    	gl.uniform4f(currentProgram.offsets, 1, binCnts[0], binCnts[0]*binCnts[1],
				tileCols.length < 4 ? 0: binCnts[0]*binCnts[1]*binCnts[2]);
		gl.uniform1f(currentProgram.numDataTiles, visTile.getNumDataTile());

		var textureLoc, loLoc, hiLoc, texWdLoc;
		var dTileCnt = 0, textureCnt = 0;
		var textureIdxLookup = {};
		
		for (var t = 0 ; t < visTile.getDataTiles().length; t++) {
			var rangeInfo = visTile.getDataTiles()[t];
			var tileId = visTile.getDataTileIds()[t];

			textureLoc = dTileCnt == 0 ? currentProgram.texture0 : dTileCnt == 1 ? currentProgram.texture1 : 
				dTileCnt == 2 ? currentProgram.texture2 : dTileCnt == 3 ? currentProgram.texture3 : 
				dTileCnt == 4 ? currentProgram.texture4 : currentProgram.texture5;
			loLoc = dTileCnt == 0 ? currentProgram.lo0 : dTileCnt == 1 ? currentProgram.lo1 : dTileCnt == 2 ? currentProgram.lo2 : 
					dTileCnt == 3 ? currentProgram.lo3 : dTileCnt == 4 ? currentProgram.lo4 : currentProgram.lo5;
			hiLoc = dTileCnt == 0 ? currentProgram.hi0 : dTileCnt == 1 ? currentProgram.hi1 : dTileCnt == 2 ? currentProgram.hi2 : 
					dTileCnt == 3 ? currentProgram.hi3 : dTileCnt == 4 ? currentProgram.hi4 : currentProgram.hi5;
			texWdLoc = dTileCnt == 0 ? currentProgram.textureWd0 : dTileCnt == 1 ? currentProgram.textureWd1 : 
						dTileCnt == 2 ? currentProgram.textureWd2 : dTileCnt == 3 ? currentProgram.textureWd3 : 
							dTileCnt == 4 ? currentProgram.textureWd4 : currentProgram.textureWd5;
			
			if (!textureIdxLookup.hasOwnProperty(tileId)){
				textureCnt++;
				gl.activeTexture(gl.TEXTURE0 + textureCnt);
				gl.bindTexture(gl.TEXTURE_2D, null); 
				gl.bindTexture(gl.TEXTURE_2D, this.get("tileTextures")[tileId]);
				textureIdxLookup[tileId] = textureCnt;
			}
		
			gl.uniform1i(textureLoc,  textureIdxLookup[tileId]);
			
			if (this.isBg()){
				gl.uniform4f(loLoc, 0, 0, 0, 0);
				
				gl.uniform4f(hiLoc, rangeInfo[ tileCols[0] ].tileEnd - rangeInfo[ tileCols[0] ].tileStart, 
						rangeInfo[ tileCols[1] ].tileEnd - rangeInfo[ tileCols[1] ].tileStart, 
						rangeInfo[ tileCols[2] ].tileEnd - rangeInfo[ tileCols[2] ].tileStart,
						tileCols.length < 4 ? 0: rangeInfo[ tileCols[3] ].tileEnd - rangeInfo[ tileCols[3] ].tileStart);
			}
			else {
				gl.uniform4f(loLoc, rangeInfo[ tileCols[0] ].relStart, rangeInfo[ tileCols[1] ].relStart, rangeInfo[ tileCols[2] ].relStart,
						tileCols.length < 4 ? 0: rangeInfo[ tileCols[3] ].relStart);
				
				gl.uniform4f(hiLoc, rangeInfo[ tileCols[0] ].relEnd, rangeInfo[ tileCols[1] ].relEnd, rangeInfo[ tileCols[2] ].relEnd,
						tileCols.length < 4 ? 0: rangeInfo[ tileCols[3] ].relEnd);
			}
			
			gl.uniform1f(texWdLoc, this.get("binnedPlots").get("allTiles")[tileId].width);
			gl.uniform1f(currentProgram.dataTileFactor, this.get("binnedPlots").get("allTiles")[tileId].factor);

			dTileCnt++;
		}
	},
	
	bindTextures : function(gl, rttFramebuffer){
		gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer);
		var rollupTexture = this.get("resultImg");
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rollupTexture, 0);
	},
	
	unbindTexture: function(gl){
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.get("dummyTex"), 0);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	},
	
	getBinTexIdx : function(cols){
		if (cols.length == 1)
			return cols[0];
		else {
			if (cols[0]<=cols[1])
				return cols[0]+"-"+cols[1];
			else
				return cols[1]+"-"+cols[0];
		}
	},
	
	
	//x (horizontal): num visual tiles
	//y (vertical): numSpecs
	resetResultStore : function(){
		var gl = this.get("gl");
		var visSpecs = this.get("binnedPlots").get("visSpecs");
		var temp = Object.keys(visSpecs);
    	temp.sort(function(a,b){ return visSpecs[a].get("type") - visSpecs[b].get("type"); });
    	
    	var binTexYPos = {};
    	var key, binIdx, count = 0;
    	
    	for (var j = 0; j < temp.length; j++){
    		key = temp[j];
    		binIdx = this.getBinTexIdx( visSpecs[key].get("cols") );
    		
    		if ( binTexYPos.hasOwnProperty(binIdx) )	continue;
    		
    		binTexYPos[binIdx] = count;
    		count += visSpecs[key].get("fboHeight") ;
    	}
		
		var binTexWd = DataUtil.logCeil(this.get("binnedPlots").get("fboWidth"),2);
		var binTexHt = DataUtil.logCeil(count, 2);
		var dummyTex = DataUtil.createTexture(gl, 16, 16);
		dummyTex.width = 16;
		dummyTex.height = 16;
		var tex = DataUtil.createTexture(gl, binTexWd, binTexHt);
		tex.width = binTexWd;
		tex.height = binTexHt;

		this.set("binYLoc", binTexYPos);
		this.set("resultImg", tex);
		this.set("dummyTex", dummyTex);
		return tex;
	},
	
	createProgram : function(gl, is3D, packing4Bytes){
		var p  = gl.createProgram();
		gl.attachShader(p, Shaders.getVertexShader(gl));
		
		if (is3D){
			switch (DataManager.numPerPix){
				case 4:
					gl.attachShader(p, Shaders.getQueryShader3D_1Byte(gl));
					break;
				case 2:
					gl.attachShader(p, Shaders.getQueryShader3D_2Bytes(gl))	;
					break;
				case 1:
					gl.attachShader(p, Shaders.getQueryShader3D_4Bytes(gl))	;
					break;
			}
		}
		else
			gl.attachShader(p, Shaders.getQueryShader4D_1Byte(gl));
		
		gl.linkProgram(p);
		p.cols = gl.getUniformLocation(p, "u_cols");
		p.binCnts = gl.getUniformLocation(p, "u_binCnts");
		p.binXPos = gl.getUniformLocation(p, "u_xLoc");
		p.binYPos = gl.getUniformLocation(p,"u_yLoc");
		p.offsets = gl.getUniformLocation(p, "u_offsets");
		p.numDataTiles = gl.getUniformLocation(p, "u_numTiles");
		p.textureWd0 = gl.getUniformLocation(p, "u_texw0");		
		p.textureWd1 = gl.getUniformLocation(p, "u_texw1");	
		p.textureWd2 = gl.getUniformLocation(p, "u_texw2");	
		p.textureWd3 = gl.getUniformLocation(p, "u_texw3");	
		p.textureWd4 = gl.getUniformLocation(p, "u_texw4");	
		p.textureWd5 = gl.getUniformLocation(p, "u_texw5");	
		p.dataTileFactor = gl.getUniformLocation(p,"u_factor");
		p.lo0 = gl.getUniformLocation(p, "u_lo0");
		p.lo1 = gl.getUniformLocation(p, "u_lo1");
		p.lo2 = gl.getUniformLocation(p, "u_lo2");
		p.lo3 = gl.getUniformLocation(p, "u_lo3");
		p.lo4 = gl.getUniformLocation(p, "u_lo4");
		p.lo5 = gl.getUniformLocation(p, "u_lo5");
		p.hi0 = gl.getUniformLocation(p, "u_hi0");
		p.hi1 = gl.getUniformLocation(p, "u_hi1");
		p.hi2 = gl.getUniformLocation(p, "u_hi2");
		p.hi3 = gl.getUniformLocation(p, "u_hi3");
		p.hi4 = gl.getUniformLocation(p, "u_hi4");
		p.hi5 = gl.getUniformLocation(p, "u_hi5");
		//p.maxCnt = gl.getUniformLocation(p,"u_maxCnt");
		p.texture0 = gl.getUniformLocation(p, "u_data0");
		p.texture1 = gl.getUniformLocation(p, "u_data1");
		p.texture2 = gl.getUniformLocation(p, "u_data2");
		p.texture3 = gl.getUniformLocation(p, "u_data3");
		p.texture4 = gl.getUniformLocation(p, "u_data4");
		p.texture5 = gl.getUniformLocation(p, "u_data5");
		return p;
	},

	createTileTextures: function(gl){
		
		var plots = this.get("binnedPlots");
		var tiles = plots.get("allTiles");
		var tex, tile;
		
		for (var i in tiles){
			if (this.get("tileTextures").hasOwnProperty(i) ){
				continue;
			}
			
			tile = tiles[i];
			
			tex = DataUtil.createTexture(gl, tile.width, tile.height, tile );
			tex.meta = tile.meta;
			tex.dataSum = tile.dataSum;
			tex.id = tile.id;
			tex.width = tile.width;
			tex.height = tile.height;				

			this.get("tileTextures")[i] = tex;
		}
	},
	
	initialize : function() {
		this.set("programs", {});
		//this.set("tileIdxLookup", {});
		_.bindAll(this, 'rollup');
		this.set("tileTextures", {});
	},
	
	clear : function(){
		var gl = this.get("gl");
		gl.clearColor(0.0, 0.0, 0.0, 0.0);                      // Set clear color to black, fully opaque  
		gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);      // Clear the color as well as the depth buffer.
	},
	
	isBg : function(){
		return this.get("isBg");
	}
	
});