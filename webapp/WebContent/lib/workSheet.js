/**
 * to replace binnedPlots
*/
var WorkSheet = Backbone.Model.extend({
	
	/**
	 * @memberOf WorkSheet
	 */
	addVisSpec: function(spec){
		
		if (spec.get("type") == VisSpec.GEO){
			spec.set("yFromTop", spec.get("phy"));
			var divID = this.get("id")+"-"+spec.get("cols").join("-");
			var visPos = spec.getVisPosition();
			var visSize = spec.getVisSize();
			
			if (d3.select("#"+divID).empty()){
				d3.select("body").append("div").attr("id", divID).attr("class", "map")
				.attr("style", "display:block; width: " + visSize.wd + "px; height: " + visSize.ht + "px; position: absolute; left: " + parseInt(this.get("x") + visPos.x) + "px; top: " + parseInt(this.get("y") + spec.get("yFromTop")) + "px; background-color:black;")
				.attr("pointer-events", "none");
//				d3.select("#geoTileMask").append("rect")
//					.attr("x", visPos.x).attr("y", spec.get("yFromTop"))
//					.attr("width", visSize.wd).attr("height", visSize.ht)
//					.style("fill", "black").attr("opacity", "0.65");
				//.attr("style", "display:block; width: " + visSize.wd + "px; height: " + visSize.ht + "px; position: absolute; left: " + parseInt(this.get("x") + visPos.x) + "px; top: " + parseInt(this.get("y") + spec.get("yFromTop")) + "px; background-color:black;opacity:0.65;")
				//.attr("pointer-events", "none");
			}
			
			var minZm = 2, maxZm = 7;
			
			spec.set("bgmap", new L.Map( divID, {scrollWheelZoom: false, inertia: false, boxZoom: false, maxZoom: maxZm, minZoom: minZm, zoomControl: false} ) );
			new L.Control.Zoom({ position: 'topright' }).addTo(spec.get("bgmap"));
			
			var tileLayer = new L.TileLayer(
					//WorkSheet.esriUrl, { 
					'https://{s}.tiles.mapbox.com/v3/mapbox.world-black/{z}/{x}/{y}.png', {
					id: 'examples.map-i86knfo3',//'examples.map-i86knfo3',
					tileSize:spec.get("bgmapTileSize"),
					minZoom: minZm, 
					maxZoom: maxZm, 
					attribution: '<a href="http://www.mapbox.com/about/maps/" target="_blank">Terms &amp; Feedback</a>'
						//WorkSheet.esriAttrib, //WorkSheet.osmAttrib,
					//styleId: 101194 //72337
			});
			
			spec.get("bgmap").setView( spec.get("center"), spec.get("zmLevels")[0] ).addLayer(tileLayer);	
			spec.updateGeoBins();
			
			var plot = this;
			spec.get("bgmap").on('move', function() {
				var change = spec.updateGeoBins();
				var event = new ImMensEvent;
				event.setParam (ImMensEvent.evtTypes.pan, spec, change); 
				visManager.fireEvent(event);
			}).on('moveStart', function() {
				var change = spec.updateGeoBins();
				var event = new ImMensEvent;
				event.setParam (ImMensEvent.evtTypes.pan, spec, change);
				visManager.fireEvent(event);
			}).on('moveend', function() {
				var change = spec.updateGeoBins();
				var event = new ImMensEvent;
				event.setParam (ImMensEvent.evtTypes.pan, spec, change);
				visManager.fireEvent(event);
			}).on('zoomstart', function(evt) {
				plot.get("fgRenderer").run([spec]);
			}).on('zoomend', function() {
				var zm = spec.get("bgmap").getZoom();
				spec.set("zmLevels", [zm, zm]);
				spec.updateGeoBins();
				var event = new ImMensEvent;
				event.setParam (ImMensEvent.evtTypes.zoom, spec, zm);
				visManager.fireEvent(event);
			}).on('mousedown', function(evt) {
				if (evt.originalEvent.shiftKey) {
					spec.get("bgmap").dragging.disable();
					actionManager.initDrag(plot, plot.getCoordInPlots(evt.originalEvent), evt.originalEvent) ;
				}
			}).on('mouseup', function(evt) {
				spec.get("bgmap").dragging.enable();
			});
		} else if (spec.get("type") == VisSpec.SP){
			var controlXPos = this.get("x") + spec.getPlaceHolderPosition().x + spec.getPlaceHolderSize().wd - 50;
			var controlYPos = this.get("y") + spec.getPlaceHolderPosition().y + 20;
			var cols = spec.get("cols");
			var maxZm = d3.max(Object.keys(dataManager.get("metadata")[cols[0]].totalBinCnt));
			var minZm = d3.min(Object.keys(dataManager.get("metadata")[cols[1]].totalBinCnt));
			var zm = spec.get("zmLevels")[0];
			// var zoomInClass = zm < maxZm ? "sp-zoom-in-enabled" : "sp-zoom-in-disabled";
			// var zoomOutClass = zm > minZm ? "sp-zoom-out-enabled" : "sp-zoom-out-disabled";
			d3.select("body").append("div").attr("class", "sp-zoom-in-enabled")
				.attr("style", "position: absolute; left: " + controlXPos + "px; top: " + controlYPos + "px;")
				.on('click', spec.zoomSP(1));
			d3.select("body").append("div").attr("class", "sp-zoom-disabled").attr("id", spec.getZoomInControlID())
				.attr("style", "position: absolute; left: " + controlXPos + "px; top: " + controlYPos + "px;")
				.style("display", zm < maxZm ? "none" : "block");
			d3.select("body").append("div").attr("class", "sp-zoom-out-enabled")
				.attr("style", "position: absolute; left: " + controlXPos + "px; top: " + (controlYPos + 30) + "px;")
				.on('click', spec.zoomSP(-1));
			d3.select("body").append("div").attr("class", "sp-zoom-disabled").attr("id", spec.getZoomOutControlID())
				.attr("style", "position: absolute; left: " + controlXPos + "px; top: " + (controlYPos + 30) + "px;")
				.style("display", zm > minZm ? "none" : "block");

			spec.set("dfltStartBins", [spec.get("startBins")[0], spec.get("startBins")[1]]);
			spec.set("yFromTop", spec.get("phy") + VisSpec.topMargin);
			spec.updateBins(0,0);
			spec.updateLabelLoc();

			var hscrollbarpos = [spec.getVisPosition().x, 
									spec.get("yFromTop") + spec.getVisSize().ht];
			var vscrollbarpos = [spec.getVisPosition().x - VisSpec.scrollBarSize, spec.get("yFromTop")];;
			d3.select("#"+this.get("maskLayer")).append("rect").attr("id", spec.getHorizontalScrollBarID() )
				.attr("width", 100).attr("height",VisSpec.scrollBarSize - 1)
				.attr("x", hscrollbarpos[0]).attr("y", hscrollbarpos[1])
				.attr("rx", 4).attr("ry", 4)
				.attr("fill", "lightgray");
				//.attr("style", "width:100px;height:"+VisSpec.scrollBarSize+"px;position: absolute; left: " + hscrollbarpos[0] + "px; top: " + hscrollbarpos[1] + "px;");
			d3.select("#"+this.get("maskLayer")).append("rect").attr("id", spec.getVerticalScrollBarID() )
				.attr("width", VisSpec.scrollBarSize - 1).attr("height",100)
				.attr("x", vscrollbarpos[0]).attr("y", vscrollbarpos[1])
				.attr("rx", 4).attr("ry", 4)
				.attr("fill", "lightgray");
				//.attr("style", "width:"+VisSpec.scrollBarSize+"px;height:100px;position: absolute; left: " + vscrollbarpos[0] + "px; top: " + vscrollbarpos[1] + "px;");

		} else if (spec.get("type") == VisSpec.HIST){
			spec.set("yFromTop", spec.get("phy") + VisSpec.topMargin);
			spec.set("dfltStartBins", [spec.get("startBins")[0]]);
			spec.updatePixPerBin();
			spec.updateBins(0,0);
			spec.updateLabelLoc();

			// var hscrollbarpos = [spec.getVisPosition().x, 
			// 						spec.get("yFromTop") + spec.getVisSize().ht];
			// d3.select("#"+this.get("maskLayer")).append("rect").attr("id", spec.getHorizontalScrollBarID() )
			// 	.attr("width", 100).attr("height",VisSpec.scrollBarSize - 1)
			// 	.attr("x", hscrollbarpos[0]).attr("y", hscrollbarpos[1])
			// 	.attr("rx", 4).attr("ry", 4)
			// 	.attr("fill", "lightgray");
				//.attr("style", "width:100px;height:"+VisSpec.scrollBarSize+"px;position: absolute; left: " + hscrollbarpos[0] + "px; top: " + hscrollbarpos[1] + "px;");

		} else if (spec.get("type") == VisSpec.BAR){
			spec.set("yFromTop", spec.get("phy") + VisSpec.topMargin);
			spec.set("dfltStartBins", [spec.get("startBins")[0]]);
			spec.updatePixPerBin();
			spec.updateBins(0,0);
			spec.updateLabelLoc();

			// var vscrollbarpos = [spec.getVisPosition().x - VisSpec.scrollBarSize, spec.get("yFromTop")];;
			// d3.select("#"+this.get("maskLayer")).append("rect").attr("id", spec.getVerticalScrollBarID() )
			// 	.attr("width", VisSpec.scrollBarSize - 1).attr("height",100)
			// 	.attr("x", vscrollbarpos[0]).attr("y", vscrollbarpos[1])
			// 	.attr("rx", 4).attr("ry", 4)
			// 	.attr("fill", "lightgray");
		}
		
		spec.updateFBOSize();
		//spec.resetVisualTiles();
		
		this.get("visSpecs")[spec.getSpecId()] = spec;
	},
	
	createCanvas : function(isBg){
		var ID = isBg? this.get("id")+"-bg" : this.get("id")+"-fg";
		if (d3.select("#"+ID).empty()){
			d3.select("body").append("canvas").attr("id", ID).attr("class", "canvas")
			.attr("width",this.get("width")).attr("height",this.get("height"))
			.attr("style", "position: absolute; left: " + this.get("x") + "px; top: " + this.get("y") + "px;");
		}

		var canvas = document.getElementById(ID);
		canvas.addEventListener("webglcontextlost", function(event) {
		    event.preventDefault();
		}, false);
		canvas.addEventListener("webglcontextrestored", this.recoverFromContextLost({recompute:true, relayout:true, prepareForZoom:true}), false);
		
		this.set(isBg? "bgCtxt" : "fgCtxt", document.getElementById(ID).getContext("webgl", { depth: false, preserveDrawingBuffer: isBg }));
	},
	
	recoverFromContextLost : function(args){
		return function(){
			this.updatePlot(args);
		}
	},

	initPlot : function(){
		//svg stuff
		d3.select("body").append("svg").attr("id", this.get("svgLayer"))
			.attr("width",this.get("width")).attr("height",this.get("height"))
			.attr("style", "position: absolute;left:"+ this.get("x") +"px; top:" + this.get("y") + "px;border: 0px solid #ddd;")

		this.createCanvas(true);
		
		//layer for geo
		d3.select("body").append("svg").attr("id", "geoTileMask").attr("class", "canvas")
		.attr("width",this.get("width")).attr("height",this.get("height"))
		.attr("style", "pointer-events:none;position: absolute;left:"+ this.get("x") +"px; top:" + this.get("y") + "px;border: 0px solid #ddd;")

		this.createCanvas(false);
		var plots = this;
		var svgLayer = document.getElementById(this.get("svgLayer"));
		
		svgLayer.addEventListener('mousemove', function(evt) {
			var coords = plots.getCoordInPlots(evt);
			
			// var toSize = actionManager.findResizable(plots, coords.x, coords.y);
			// if (toSize){
			// 	switch (toSize.get("resize")){
			// 	case VisSpec.resize.wd:
			// 		document.body.style.cursor = "col-resize";
			// 		break;
			// 	case VisSpec.resize.ht:
			// 		document.body.style.cursor = "row-resize";
			// 		break;
			// 	default:
			// 		document.body.style.cursor = "se-resize";
			// 		break;
			// 	}
				
			// }
			// else {
				document.body.style.cursor="default";
				actionManager.brush(plots, coords.x, coords.y) ;
			// }
		}, false);
		
		svgLayer.addEventListener('mouseout', function(evt) {
			if (plots.get("activeSpec"))	return;
			plots.set("brushFilter", undefined);
			plots.updateFg();
		}, false);
		
		svgLayer.addEventListener('mousedown', function(evt) {
			actionManager.initDrag(plots, plots.getCoordInPlots(evt), evt) ;
		}, false);

		svgLayer.ondblclick = function(evt){
			actionManager.centerZoom(plots, plots.getCoordInPlots(evt), evt) ;
		};

		svgLayer.onclick = function(evt){
			actionManager.selectPoint(plots, plots.getCoordInPlots(evt), evt) ;
		};
		
		
		//mask layer
		d3.select("body").append("svg").attr("id", this.get("maskLayer")).attr("class", "mask")
			.attr("width",this.get("width")).attr("height",this.get("height"))
			.attr("style", "pointer-events:none;position: absolute;left:"+ this.get("x") +"px; top:" + this.get("y") + "px;border: 0px solid #ddd;")


		var bgProc = DataManager.useWebGL? new WebGLProcessor({
												gl: this.get("bgCtxt"),
												binnedPlots: this,
												isBg: true,
											}) : 
										new JSProcessor({
											binnedPlots: this,
											isBg: true,
										});
		
		var fgProc = DataManager.useWebGL? new WebGLProcessor({
												gl: this.get("fgCtxt"),
												binnedPlots: this,
												isBg: false,
											}) : 
											new JSProcessor({
												binnedPlots: this,
												isBg: false,
											});
		
		this.set({
			bgProcessor : bgProc,
					
			bgRenderer : new WebGLRenderer({
						gl: this.get("bgCtxt"),
						binnedPlots: this,
						isBg: true,
						processor: bgProc
					}),
					
			fgProcessor : fgProc,
					
			fgRenderer : new WebGLRenderer({
						gl: this.get("fgCtxt"),
						binnedPlots: this,
						isBg: false,
						processor: fgProc
					})
		});
	},
	
	initDataTiles : function(isBg){ //activeSpec
		
		var allRequiredTiles = [];
		var allAvailableTiles = {};

		var specs = this.get("visSpecs");

		for (var i in specs){
			spec = specs[i];
			//if (spec.get("isPlaceHolder")) continue;
			var vTile2dTileMap;

			if (!isBg)
				vTile2dTileMap = spec.getRequiredDataTilesForBrush(this.get("brushFilter"), isBg);
			else
				vTile2dTileMap = spec.getRequiredDataTilesForBrush(undefined, isBg);
			//console.log(vTile2dTileMap);

			var dTileIds, vTile;
			for (var vTileId in vTile2dTileMap){
				vTile = spec.get("visualTiles")[vTileId];
				dTileIds = vTile2dTileMap[vTileId];
				for (var j = 0; j < dTileIds.length; j++){
					if (allRequiredTiles.indexOf(dTileIds[j]) < 0)
						allRequiredTiles.push(dTileIds[j]);
				}
				
				var tiles = dataManager.getDataTiles(dTileIds);
				vTile.resetDataTiles();
				
				for (var j = 0; j < tiles.length; j++){
					if ( !allAvailableTiles.hasOwnProperty( tiles[j].id ))
						allAvailableTiles[ tiles[j].id ] = tiles[j];
					vTile.addDataTile( tiles[j] );
				}//add data tiles required for each visual tile
			}// for each visual tile
			
			var numTiles = Object.keys(vTile2dTileMap).length;
			this.set("fboWidth", spec.get("fboWidthPerVTile") * numTiles );
		}//for each spec
		
		this.set("allTiles", allAvailableTiles);
		this.set("allRequiredTiles", allRequiredTiles);
		//console.log(this.get("allRequiredTiles"));
	},
	
	getCoordInPlots : function(ev){
		var evt = ev? ev : window.event;
		var fgCanvas = document.getElementById(this.get("id")+"-fg");
		var rect = fgCanvas.getBoundingClientRect(), root = document.documentElement;
		// return relative mouse position
		var x_pos = evt.clientX - rect.left - root.scrollLeft;
		var y_pos = evt.clientY - rect.top - root.scrollTop;
		return {x: x_pos, y: y_pos};
	},
	
	processEvent: function(event) {
		
		if (this.get("activeSpec") != event.getSource()) {
			//this.initDataTiles(event.getSource());
			this.set("activeSpec", event.getSource());
		}
		//console.log(event.getType(), event.getSource());
		switch (event.getType()) {
		case ImMensEvent.evtTypes.clear:
			var canvasId = this.get("maskLayer");
			d3.select("#"+canvasId).selectAll(".mask").remove();
			this.set("brushFilter", undefined);
			this.initDataTiles(false);
			this.updateFg(true);
			break;
		case ImMensEvent.evtTypes.brush:
			this.set("brushFilter", event.getValue());
			this.initDataTiles(false);
			this.updateFg();
			break;
		case ImMensEvent.evtTypes.rangeSelect:
			if (event.getSource().get("type")!=VisSpec.GEO){
				var canvasId = this.get("maskLayer");
				d3.select("#"+canvasId).selectAll(".mask").remove();
			}
			this.set("brushFilter", event.getValue());
			this.initDataTiles(false);
			this.updateFg(true);
			break;
		case ImMensEvent.evtTypes.pan:
			if (this.get("brushFilter") && Object.keys(this.get("brushFilter")).length == 2){
				this.set("brushFilter", undefined);
				this.set("activeSpec", undefined);
			}
			//console.log(this.get("brushFilter"));
			var canvasId = this.get("maskLayer");
			d3.select("#"+canvasId).selectAll(".mask").remove();
			
			// if (event.getSource().get("type") == VisSpec.SP){
			// 	event.getSource().updateBins(event.getValue()[0], event.getValue()[1], false);
			// }
			for (var s in this.get("visSpecs")) {
				this.get("visSpecs")[s].resetVisualTiles();
			}
			if (event.getSource().get("type") == VisSpec.SP)
				this.visualizeBg(true);
			//this.get("fgProcessor").resetResultStore();
			this.initDataTiles(false);
			this.updateFg(true);
			this.prepareForBrush();
			this.prepareForZoom();
			break;
		case ImMensEvent.evtTypes.zoom:
			if (this.get("brushFilter") && Object.keys(this.get("brushFilter")).length == 2){
				this.set("brushFilter", undefined);
				this.set("activeSpec", undefined);
			}
			var canvasId = this.get("maskLayer");
			d3.select("#"+canvasId).selectAll(".mask").remove();
			for (var s in this.get("visSpecs")) {
				this.get("visSpecs")[s].resetVisualTiles();
			}
			this.initDataTiles(false);
			this.visualizeBg(true);
			
			//this.get("fgProcessor").resetResultStore();
			this.updateFg(true);
			this.prepareForBrush();
			this.prepareForZoom();
			break;
		case ImMensEvent.evtTypes.repaintFg:
			this.get("fgRenderer").run();
			break;
		case ImMensEvent.evtTypes.repaintBg:
			this.get("bgRenderer").run();
			break;
		case ImMensEvent.evtTypes.adjustView:
			//if (event.getSource().get("type") != VisSpec.GEO && event.getValue())
			// if (event.getSource().get("type") == VisSpec.SP)
			// 	event.getSource().updateBins(0,0,true);
			this.adjustView(event.getSource());
			break;
		}
	},
	
	prepareForZoom: function(){
		var specs = this.get("visSpecs");
		var spec, currentZm;
		for (var k in specs){
			spec = specs[k];
			currentZm = spec.get("zmLevels")[0];
			var adjacentTiles = [];
			if (dataManager.get("metadata")[spec.get("cols")[0]].totalBinCnt.hasOwnProperty(currentZm+1)){
				
				var dimInfos;
				for (var vTileId in spec.get("visualTiles")){
					dimInfos = spec.get("visualTiles")[vTileId].getMultiDimInfo().changeZoom(1);
					adjacentTiles = DataUtil.removeDuplicates(adjacentTiles.concat(dimInfos.getRequiredDataTiles()));
				}
			}
			if (dataManager.get("metadata")[spec.get("cols")[0]].totalBinCnt.hasOwnProperty(currentZm-1)){
				
				var dimInfos;
				for (var vTileId in spec.get("visualTiles")){
					dimInfos = spec.get("visualTiles")[vTileId].getMultiDimInfo().changeZoom(-1);
					adjacentTiles = DataUtil.removeDuplicates(adjacentTiles.concat(dimInfos.getRequiredDataTiles()));
				}
			}
			dataManager.fetchTiles(adjacentTiles);
		}//for each spec
	},
	
	//find out tiles needed for brushing and linking and prefetch 
	prepareForBrush : function(){
		var specs = this.get("visSpecs");
		var vTiles2dTiles;
		var toFetch = [];
		for (var k1 in specs){
			for (var k2 in specs){
				if (!(k1.toString() < k2.toString()))	continue;
				vTiles2dTiles = specs[k1].getRequiredDataTilesForSpec(specs[k2]);
				for (var vTileId in vTiles2dTiles){
					toFetch = toFetch.concat(vTiles2dTiles[vTileId]);
				}
			}
		}
		dataManager.fetchTiles(toFetch);
	},

	refreshAxisLabel : function(){
		//axis
		var svgLayer = d3.select("#"+this.get("svgLayer"));
		svgLayer.selectAll(".axis").remove();
		d3.selectAll("."+this.get("id")+"label").remove();
		svgLayer.selectAll(".phbg").remove();
		
		var specs = this.get("visSpecs");
		var spec;
		
		for (var key in specs){
			spec = specs[key];
			
			//background rect
			var phSize = spec.getPlaceHolderSize();
			var phPos = spec.getPlaceHolderPosition();
			var visPos = spec.getVisPosition();
			var visSize = spec.getVisSize();
			svgLayer.append("rect")
				.attr("x", spec.get("phx"))
				.attr("y", spec.get("phy"))
				.attr("width", phSize.wd)
				.attr("height", phSize.ht)
				.attr("fill", "white")
				.attr("class", "phbg")
				.attr("fill-opacity", 0.9)
				.attr("rx", 5).attr("ry", 5)
				;
			
			//axis
			if (spec.get("type") != VisSpec.GEO){
				var hscrollsize = spec.get("type") == VisSpec.BAR ? 2 : VisSpec.scrollBarSize;
				var vscrollsize = spec.get("type") == VisSpec.HIST? 2 : VisSpec.scrollBarSize
				svgLayer.append("g")
					.attr("id", spec.getAxisDOMId(false))
					.attr("class", "axis")
					.attr("transform", "translate(" +  parseInt(visPos.x - vscrollsize)  + ","+ parseInt(spec.get("yFromTop") ) +")");
			
				svgLayer.append("g")
					.attr("id", spec.getAxisDOMId(true))
					.attr("class", "axis")
					.attr("transform", "translate(" + visPos.x  + ","+ parseInt(visSize.ht + spec.get("yFromTop") + hscrollsize) +")");
			}
			
			//label
			if (spec.get("type") == VisSpec.BAR){
				var centerX = phPos.x + 15; // + phSize.wd/2;
				var centerY = phPos.y + 10; //spec.get("yFromTop") + phSize.ht/2;
				svgLayer.append("text").attr("class", this.get("id")+"label label").text(spec.get("labels")[0])
						.attr("x", spec.get("labelLoc")[0][0])
						.attr("y", spec.get("labelLoc")[0][1])
						.attr("transform", "rotate(-90," + centerX + ", " + centerY + ") translate(" + -150 + ", " + 0 + ")")
						;
			}
			else if (spec.get("type") == VisSpec.HIST){
				d3.select("body").append("span").attr("class", this.get("id")+"label label").text(spec.get("labels")[0])
				.attr("style", "position: absolute; left: " + parseInt(spec.get("labelLoc")[0][0] + this.get("x")) + "px; top: " + parseInt(spec.get("labelLoc")[0][1] + this.get("y")) + "px;");
			}
			else if (spec.get("type") == VisSpec.SP){
				d3.select("body").append("span").attr("class", this.get("id")+"label label").text(spec.get("labels")[0])
				.attr("style", "position: absolute; left: " + parseInt(spec.get("labelLoc")[0][0] + this.get("x")) + "px; top: " + parseInt(spec.get("labelLoc")[0][1] + this.get("y")) + "px;");
				
				var centerX = phPos.x + 15; // + phSize.wd/2;
				var centerY = phPos.y + 10; //spec.get("yFromTop") + phSize.ht/2;
				svgLayer.append("text").attr("class", this.get("id")+"label label").text(spec.get("labels")[1])
						.attr("x", spec.get("labelLoc")[1][0])
						.attr("y", spec.get("labelLoc")[1][1])
						.attr("transform", "rotate(-90," + centerX + ", " + centerY + ") translate(" + -150 + ", " + 0 + ")")
						;
			}
		}
	},

	adjustView : function(spec) {

		var wkSheet = this;

		function animateAdjustment(){
			//console.log("adjust view ", spec);
			var cols = spec.get("cols");

			var xAdjust = false, yAdjust = false;
			var maxXBin, maxYBin, xBinWd, yBinWd;
			var direction, speed, x = 0, y = 0, weight = 2.0;
			var xDim = undefined, yDim = undefined;

			if (spec.get("type") == VisSpec.HIST){
				xDim = 0;
				
			} else if (spec.get("type") == VisSpec.BAR){
				yDim = 0;

			} else {
				xDim = 0;
				yDim = 1;
				
			}

			if (!isNaN(xDim)){
				maxXBin = dataManager.get("metadata")[cols[xDim]].totalBinCnt[spec.get("zmLevels")[xDim]] - 1;
				xBinWd = dataManager.get("metadata")[cols[xDim]].binWidth[spec.get("zmLevels")[xDim]];
				xAdjust = (spec.get("startBins")[xDim] < 0 && spec.get("endBins")[xDim] < maxXBin) ||
						  (spec.get("endBins")[xDim] > maxXBin && spec.get("startBins")[xDim] > 0);
			}

			if (!isNaN(yDim)){
				maxYBin = dataManager.get("metadata")[cols[yDim]].totalBinCnt[spec.get("zmLevels")[yDim]] - 1;
				yBinWd = dataManager.get("metadata")[cols[yDim]].binWidth[spec.get("zmLevels")[yDim]];
				yAdjust = (spec.get("startBins")[yDim] < 0 && spec.get("endBins")[yDim] < maxYBin) ||
						  (spec.get("endBins")[yDim] > maxYBin && spec.get("startBins")[yDim] > 0);
			}
			
			if (xAdjust) {
				direction = spec.get("startBins")[xDim] < 0 ? 1 : -1;
				//speed = 1.0;
				speed = spec.get("startBins")[xDim] < 0 ?  Math.ceil(-spec.get("startBins")[xDim]/weight) : 
					Math.ceil( (spec.get("endBins")[xDim] - maxXBin)/weight);
				// if (speed < 0)
				// 	speed = 0;
				x = direction*speed;
			}
			if (yAdjust) {
				direction = spec.get("startBins")[yDim] < 0 ? 1 : -1;
				//speed = 1.0;
				speed = spec.get("startBins")[yDim] < 0 ?  Math.ceil(-spec.get("startBins")[yDim]/weight) : 
					Math.ceil( (spec.get("endBins")[yDim] - maxYBin)/weight);
				// if (speed < 0)
				// 	speed = 0;
				y = direction*speed;
			}

			if (xAdjust || yAdjust){
				animating = true;
				spec.updateBins(x, y, true);
				wkSheet.visualizeBg(true);
				wkSheet.initDataTiles(false);
				wkSheet.updateFg(true);

				requestAnimFrame(animateAdjustment);
			} else {
				wkSheet.visualizeBg(true);
				wkSheet.initDataTiles(false);
				wkSheet.updateFg(true);
				animating = false;
			}
			
		};

		animateAdjustment();
		
		
	},

	updatePlot: function(args){
		VisManager.updateStatus(false);

		if (args.relayout){
			this.refreshAxisLabel();
		}

		if (Object.keys( this.get("visSpecs") ).length > 0){
			//this.get("plots").set("visSpecs", this.get("visSpecs"));
			//update the size of fbo texture for bg and fg processors
			// var resetFBO = false;
			// if (args.recompute) {
			// 	resetFBO = true;
			// 	this.get("bgProcessor").resetResultStore();
			// 	this.get("fgProcessor").resetResultStore();
			// }
			// this.visualizeBg(resetFBO);
			// this.updateFg(resetFBO);
			
			this.visualizeBg(args.recompute);
			this.initDataTiles(false);
			this.updateFg(args.recompute);
			this.prepareForBrush();
			if (args.prepareForZoom)
				this.prepareForZoom();
		}
	},
	
	visualizeBg : function(resetFBO){
		for (var s in this.get("visSpecs")){
			this.get("visSpecs")[s].resetVisualTiles();
		}
		
		this.initDataTiles(true);
		// if (mainVisSpec){
		// 	var mainVisBrush = {};
		// 	var cols = mainVisSpec.get("cols");
		// 	var tempDimInfo;
		// 	for (var a = 0; a < cols.length; a++){
		// 		tempDimInfo = new DimInfo;
		// 		tempDimInfo.setInfo(cols[a], mainVisSpec.get("zmLevels")[a], 
		// 					mainVisSpec.get("startBins")[a], mainVisSpec.get("endBins")[a]);
		// 		mainVisBrush[cols[a]] = tempDimInfo;
		// 	}
		// 	for (var s in this.get("visSpecs")){
		// 		spec = this.get("visSpecs")[s];
		// 		if (mainVisSpec == spec)	continue;
		// 		var vTiles = spec.get("visualTiles");
		// 		for (var v in vTiles){
		// 			vTiles[v].updateDataTileWithBrushInfo_new(mainVisBrush);
		// 		}
		// 	}
		// }
		
		if (resetFBO) 
			this.get("bgProcessor").resetResultStore();
		this.get("bgProcessor").run();
		this.get("bgRenderer").run();
	},
	
	updateFg : function(resetFBO) {
		var spec;
		
		for (var s in this.get("visSpecs")){
			spec = this.get("visSpecs")[s];
			//if brushfilter is from geo, do not update, NEEDS REVISION
			if (this.get("brushFilter") && Object.keys(this.get("brushFilter")).length == 2 && spec.get("type") == VisSpec.GEO)
				continue;
			//if (this.get("activeSpec") && this.get("activeSpec") == spec && spec.get("type") == VisSpec.GEO) continue;
			var vTiles = spec.get("visualTiles");
			for (var v in vTiles){
				vTiles[v].updateDataTileWithBrushInfo_new(this.get("brushFilter"));
				//vTiles[v].updateDataTileWithBrushInfo(this.get("brushFilter"));
			}
		}
		if (resetFBO) 
			this.get("fgProcessor").resetResultStore();
		this.get("fgProcessor").run();
		this.get("fgRenderer").run();
	},

	toString : function(){
		var visSpecs = this.get("visSpecs");
		var str = "";
		for (var s in visSpecs){
			str += visSpecs[s].getState();
		}
		return str;
	},
	
	initialize : function(){
		this.set("visSpecs", {});
		this.set("fboWidth", 0);
		//this.set("maxBinCntPerTile", 0);
		this.set("rollupStats",{});
		this.set("svgLayer", this.get("id") + "-svgLayer");
		this.set("maskLayer", this.get("id") + "-maskLayer");
		this.set("activeSpec", undefined);
		
		this.set("gridLayout", new GridLayout);
		this.get("gridLayout").set({
			"plot": this,
			});
		this.get("gridLayout").setParam(this.get("width"), this.get("height"), 20);
		this.get("gridLayout").reGenerateGrid();
		this.get("gridLayout").relayout();
		
	}
},{
	//MAX_LATITUDE: 85.0840591556,
	//R_MINOR: 6356752.3142,
	//R_MAJOR: 6378137,
	CloudmadeUrl : 'http://{s}.tile.cloudmade.com/a890b24c87ce4bd3a9365f3750d15777/101194/256/{z}/{x}/{y}.png',
	osmUrl: "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
	osmAttrib: 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
	CloudmadeAttribution : 'Map data &copy; OpenStreetMap contributors, Imagery &copy; CloudMade',
	esriUrl: 'http://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
	esriAttrib: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTE'
});