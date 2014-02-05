var ActionManager = Backbone.Model.extend({
	
	/**
	 * @memberOf ActionManager
	 */
	initDrag : function(plots, coordInPlots, evt){
		
		var x = coordInPlots.x, y = coordInPlots.y;
		var spec;

		// spec = this.findResizable(plots, x, y);
		// if (spec){
		// 	this.set("dragMode", ActionManager.dragModes.resize);
		// 	this.setInitDragParam(plots, spec, coordInPlots);
		// }
		
		// else {
			spec = this.getVisSpec(plots, coordInPlots.x, coordInPlots.y);
			
			if (spec)	{
				if (evt.shiftKey)
					this.set("dragMode", ActionManager.dragModes.select);
				else if (spec.get("type") == VisSpec.SP)
					this.set("dragMode", ActionManager.dragModes.pan);
				else
					return;

				this.setInitDragParam(plots, spec, coordInPlots);
			}
			else {
				this.set("selStartPixs", undefined);
				this.set("activePlot", undefined);
				this.set("activeSpec", undefined);
				this.set("selectedSpec", undefined);
				var event = new ImMensEvent;
				event.setParam (ImMensEvent.evtTypes.clear);
				visManager.fireEvent(event);
				//return;
			}

		// }
	},

	centerZoom : function(plots, coordInPlots, evt){
		var spec = this.getVisSpec(plots, coordInPlots.x, coordInPlots.y);
		if (spec && spec.get("type") == VisSpec.SP){
			var visPos = spec.getVisPosition();
			var xInVis = coordInPlots.x - visPos.x, yInVis = coordInPlots.y - spec.get("yFromTop");
			var cols = spec.get("cols");
			var xBin = spec.pixToBin(xInVis, 0, true); 
			var yBin = spec.pixToBin(yInVis, 1, false);
			var xColMeta = dataManager.get("metadata")[cols[0]];
			var yColMeta = dataManager.get("metadata")[cols[1]];
			var centerValues = [xColMeta.binStartValue + xBin * xColMeta.binWidth[spec.get("zmLevels")[0]],
								yColMeta.binStartValue + yBin * yColMeta.binWidth[spec.get("zmLevels")[1]]];
			spec.zoomSP(1, centerValues)();
		}
	},

	selectPoint: function(plots, coordInPlots, evt){
		var spec = this.getVisSpec(plots, coordInPlots.x, coordInPlots.y);
		if (spec && spec.get("cols").length == 1 && !evt.shiftKey){
			this.set("selectedSpec", spec);
			var visPos = spec.getVisPosition();
			var xInVis = coordInPlots.x - visPos.x, yInVis = coordInPlots.y - spec.get("yFromTop");
			var cols = spec.get("cols");
			var bin;
			if (spec.get("type") == VisSpec.HIST)
				bin = spec.pixToBin(xInVis, 0, true); 
			else 
				bin = spec.pixToBin(yInVis, 0, false);
			
			var hzF = new DimInfo, vtF = new DimInfo, brushFilter = {};
			hzF.setInfo(cols[0], spec.get("zmLevels")[0], bin, bin); 
			brushFilter[cols[0]] = hzF;

			var event = new ImMensEvent;
			event.setParam (ImMensEvent.evtTypes.rangeSelect, spec, brushFilter);
			visManager.fireEvent(event);
		} 
		// else {
		// 	this.set("selectedSpec", undefined);
		// }
	},
	
	setInitDragParam : function(plot, spec, coordInPlots) {
		this.set("activePlot", plot);
		this.set("activeSpec", spec);
		this.set("selStartPixs", [coordInPlots.x , coordInPlots.y]);
		document.onmousemove = this.onDrag;
		document.onmouseup = this.endDrag;
	},
	
	onDrag : function(evt){
		
		//console.log(coordInPlots, coordInPlots.x);
		var plots = this.get("activePlot");
		var coordInPlots = plots.getCoordInPlots(evt);
		
		switch(this.get("dragMode")){
			case ActionManager.dragModes.resize:
				if (!this.get("selStartPixs"))	return;
				plots.resize(this.get("activeSpec"), 
						coordInPlots.x - this.get("selStartPixs")[0], 
						coordInPlots.y - this.get("selStartPixs")[1] );
				this.get("activeSpec").updatePixPerBin();
				this.get("activeSpec").updateLabelLoc();
				break;
			case ActionManager.dragModes.pan:
				this.pan(evt);
				break;
			case ActionManager.dragModes.select:
				if (!this.get("selStartPixs"))	return;
				this.selectArea(evt);
				break;
			default:
				break;
		}
		
//		if (!this.get("activeSpec"))	return;
//		
//		var e = window.event;
//		if (e.altKey)	this.pan();
//		else	this.selectArea();
	},
	
	endDrag : function(e){
		switch(this.get("dragMode")){
			case ActionManager.dragModes.resize:
				var activeSpec = this.get("activeSpec");
				activeSpec.set({
					resize: VisSpec.resize.none,
//					dfltWidth: activeSpec.get("width"),
//					dfltHeight: activeSpec.get("height"),
					phDfltWd: activeSpec.get("phDfltWd") + activeSpec.get("deltaX"),
					phDfltHt: activeSpec.get("phDfltHt") + activeSpec.get("deltaY"),
					deltaX: 0,
					deltaY: 0,
				});
				activeSpec.updatePixPerBin();
				this.get("activeSpec").updateLabelLoc();
				this.set("activePlots", undefined);
				this.set("activeSpec", undefined);
				this.set("selStartPixs",undefined);
				break;
			case ActionManager.dragModes.pan:
				this.pan(e, true);
				this.set("activeSpec", undefined);
				this.set("activePlots", undefined);
				this.set("selStartPixs",undefined);
				break;
			case ActionManager.dragModes.select:
				this.set("selectedSpec", this.get("activeSpec"));
				if (this.get("activeSpec").get("cols").length == 1)
					this.selectArea(e);
				break;
			default:
				break;
		}
		
		
		document.body.style.cursor = "default"; 
		document.onmousemove = null;
		document.onmouseup = null;	
		this.set("dragMode", ActionManager.dragModes.none);
	},
	
	selectArea: function(evt){
		var spec = this.get("activeSpec");
		document.body.style.cursor = spec.get("cols").length == 2 ? "crosshair" : 
									spec.get("type") == VisSpec.BAR ? "ns-resize" : "ew-resize";
		var canvasId = this.get("activePlot").get("maskLayer");
		d3.select("#"+canvasId).selectAll(".mask").remove();
		
		var currentCoord = this.get("activePlot").getCoordInPlots(evt);
		var visPos = spec.getVisPosition(), visSize = spec.getVisSize();
		
		var nw = { 
				x : Math.max(0, Math.min(this.get("selStartPixs")[0] - visPos.x, currentCoord.x - visPos.x) ), 
				y:	Math.max(0, Math.min(this.get("selStartPixs")[1] - spec.get("yFromTop"), currentCoord.y - spec.get("yFromTop")) )
		};
		var se = {
				x : Math.min(visSize.wd, Math.max(this.get("selStartPixs")[0] - visPos.x, currentCoord.x - visPos.x) ),
				y : Math.min(visSize.ht, Math.max(this.get("selStartPixs")[1] - spec.get("yFromTop"), currentCoord.y - spec.get("yFromTop")) )
		}; 
		
		var hzF = new DimInfo, vtF = new DimInfo, brushFilter = {};
		//geo heatmap: bin index goes from low to high vertically down
		if (spec.get("type") == VisSpec.GEO) {
			hzF.setInfo(spec.get("cols")[0], spec.get("zmLevels")[0], 
					spec.pixToBin(nw.x, 0, true), 
					spec.pixToBin(se.x, 0, true));
			vtF.setInfo(spec.get("cols")[1], spec.get("zmLevels")[1], 
					spec.pixToBin(nw.y, 1, false), 
					spec.pixToBin(se.y, 1, false));
			brushFilter[spec.get("cols")[0]] = hzF;
			brushFilter[spec.get("cols")[1]] = vtF;
			
		} else if (spec.get("type") == VisSpec.SP) { //binned scatterplot: bin index goes from low to high vertically up
			hzF.setInfo(spec.get("cols")[0], spec.get("zmLevels")[0], 
					spec.pixToBin(nw.x, 0, true), 
					spec.pixToBin(se.x, 0, true));
			var y1 = spec.pixToBin(se.y, 1, false), y2 = spec.pixToBin(nw.y, 1, false);
			vtF.setInfo(spec.get("cols")[1], spec.get("zmLevels")[1], 
					d3.min([y1,y2]), 
					d3.max([y1,y2]));
			brushFilter[spec.get("cols")[0]] = hzF;
			brushFilter[spec.get("cols")[1]] = vtF;
			
		} else if (spec.get("type") == VisSpec.HIST) {
			hzF.setInfo(spec.get("cols")[0], spec.get("zmLevels")[0], 
					spec.pixToBin(nw.x, 0, true), 
					spec.pixToBin(se.x, 0, true));
			brushFilter[spec.get("cols")[0]] = hzF;
			
		} else if (spec.get("type") == VisSpec.BAR) {
			vtF.setInfo( spec.get("cols")[0], spec.get("zmLevels")[0], 
					spec.pixToBin(nw.y, 0, false), 
					spec.pixToBin(se.y, 0, false));
			brushFilter[spec.get("cols")[0]] = vtF;
		}

		var event = new ImMensEvent;
		event.setParam (ImMensEvent.evtTypes.rangeSelect, spec, brushFilter);
		visManager.fireEvent(event);

		//this.set("selectedSpec", spec);
		
		if (spec.get("type") != VisSpec.GEO)	return;
		
		var maskOpacity = this.get("maskOpacity");
		
		d3.select("#"+canvasId).append("rect")
			.attr("class", "mask")
			.attr("fill-opacity", maskOpacity)
			.attr("fill", "black")
			.attr("pointer-events", "none")
			.attr("x", visPos.x).attr("y", spec.get("yFromTop"))
			.attr("width", nw.x)
			.attr("height", visSize.ht);

		d3.select("#"+canvasId).append("rect")
			.attr("class", "mask")
			.attr("fill-opacity", maskOpacity)
			.attr("fill", "black")
			.attr("pointer-events", "none")
			.attr("x", nw.x + visPos.x).attr("y", spec.get("yFromTop"))
			.attr("width", se.x - nw.x)
			.attr("height", nw.y);

		d3.select("#"+canvasId).append("rect")
			.attr("class", "mask")
			.attr("fill-opacity", maskOpacity)
			.attr("fill", "black")
			.attr("pointer-events", "none")
			.attr("x", nw.x + visPos.x).attr("y", se.y + spec.get("yFromTop"))
			.attr("width", se.x - nw.x)
			.attr("height", visSize.ht - se.y);


		d3.select("#"+canvasId).append("rect")
			.attr("class", "mask")
			.attr("fill-opacity", maskOpacity)
			.attr("fill", "black")
			.attr("pointer-events", "none")
			.attr("x", se.x + visPos.x).attr("y", spec.get("yFromTop"))
			.attr("width", visSize.wd - se.x)
			.attr("height", visSize.ht);
	},
	
	pan : function(evt, endPan){
		var spec = this.get("activeSpec");
		document.body.style.cursor = spec.get("cols").length == 2 ? "move" : 
									spec.get("type") == VisSpec.BAR ? "ns-resize" : "ew-resize";

		var cols = spec.get("cols");
		var currentCoord = this.get("activePlot").getCoordInPlots(evt);

		var hDiff, vDiff;
		if (spec.get("type") == VisSpec.HIST){
			hDiff = spec.pixToBin(this.get("selStartPixs")[0] - spec.getVisPosition().x, 0, true) - 
					spec.pixToBin(currentCoord.x - spec.getVisPosition().x, 0, true);
			vDiff = 0;
		} else if (spec.get("type") == VisSpec.BAR){
			vDiff = spec.pixToBin(this.get("selStartPixs")[1] - spec.get("yFromTop"), 0, false) - 
					spec.pixToBin(currentCoord.y - spec.get("yFromTop"), 0, false);
			hDiff = 0;
		} else { //SP
			hDiff = spec.pixToBin(this.get("selStartPixs")[0] - spec.getVisPosition().x, 0, true) - 
					spec.pixToBin(currentCoord.x - spec.getVisPosition().x, 0, true);
			vDiff = spec.pixToBin(this.get("selStartPixs")[1] - spec.get("yFromTop"), 1, false) - 
					spec.pixToBin(currentCoord.y - spec.get("yFromTop"), 1, false);
		}

		// var canPanHorizontal = (spec.get("type")!= VisSpec.BAR && (spec.get("endBins")[0] - spec.get("startBins")[0] + 1) < xColMeta.totalBinCnt[spec.get("zmLevels")[0]] );
		// var verticalDim = spec.get("cols").length == 2 ? 1 : spec.get("type") == VisSpec.BAR ? 0 : undefined;

		// var canPanVertical = (!isNaN(verticalDim) && (spec.get("endBins")[verticalDim] - spec.get("startBins")[verticalDim] + 1) < 
		// 							dataManager.get("metadata")[cols[verticalDim]].totalBinCnt[spec.get("zmLevels")[verticalDim]] );

		
		// if (canPanHorizontal && canPanVertical){
		// 	document.body.style.cursor = "move";
		// 	var xDelta = this.get("selStartPixs")[0] - currentCoord.x;
		// 	hDiff = xDelta * xColMeta.binWidth[spec.get("zmLevels")[0]]/spec.get("pixPerBin")[0];
		// 	var yDelta = currentCoord.y - this.get("selStartPixs")[1];
		// 	var yColMeta = dataManager.get("metadata")[cols[1]];
		// 	vDiff = yDelta * yColMeta.binWidth[spec.get("zmLevels")[1]]/spec.get("pixPerBin")[1];
		// } else if (canPanHorizontal){
		// 	document.body.style.cursor = "ew-resize";
		// 	var xDelta = this.get("selStartPixs")[0] - currentCoord.x;
		// 	hDiff = xDelta * xColMeta.binWidth[spec.get("zmLevels")[0]]/spec.get("pixPerBin")[0];
		// 	vDiff = 0;
		// } else if (canPanVertical){
		// 	document.body.style.cursor = "ns-resize";
		// 	var delta = verticalDim == 0 ? this.get("selStartPixs")[0] - currentCoord.x : this.get("selStartPixs")[1] - currentCoord.y;
		// 	vDiff = delta * dataManager.get("metadata")[cols[verticalDim]].binWidth[spec.get("zmLevels")[verticalDim]]/spec.get("pixPerBin")[verticalDim];
		// } else {
		// 	return;
		// }
		
		// if (spec.get("cols").length == 2){
		// 	var yDelta = currentCoord.y - this.get("selStartPixs")[1];
		// 	var yColMeta = dataManager.get("metadata")[cols[1]];
		// 	var yDiff = yDelta * yColMeta.binWidth[spec.get("zmLevels")[1]]/spec.get("pixPerBin")[1];
		// }
		
		spec.updateBins(hDiff, vDiff, endPan);
		var event = new ImMensEvent;
		event.setParam (ImMensEvent.evtTypes.pan, spec, [hDiff, vDiff]);
		visManager.fireEvent(event);

		if (endPan){
			var event = new ImMensEvent;
			event.setParam (ImMensEvent.evtTypes.adjustView, spec, undefined);
			visManager.fireEvent(event);			
		}
	},

	benchmarkPan : function(spec){

		var hDiff = 0, vDiff = 0;
		var run = function(){
			if (hDiff < 50){
				hDiff++;
				spec.updateBins(hDiff, vDiff);
				var event = new ImMensEvent;
				event.setParam (ImMensEvent.evtTypes.pan, spec, [hDiff, vDiff]);
				visManager.fireEvent(event);
			} else if (vDiff < 50){
				vDiff++;
				spec.updateBins(hDiff, vDiff);
				var event = new ImMensEvent;
				event.setParam (ImMensEvent.evtTypes.pan, spec, [hDiff, vDiff]);
				visManager.fireEvent(event);
			} else {
				spec.updateBins(hDiff, vDiff, endPan);
				var event = new ImMensEvent;
				event.setParam (ImMensEvent.evtTypes.pan, spec, [hDiff, vDiff]);
				visManager.fireEvent(event);
			}

		};

		run();

	},
	
	brush : function(plots, x, y){

		//console.log(this.get("selectedSpec"));
		
		if (this.get("selectedSpec") || animating || this.get("dragMode") != ActionManager.dragModes.none){
			return;
		}
		
		var spec = this.getVisSpec(plots, x, y);
		if (!spec || spec.get("cols").length === 2) { 
			var event = new ImMensEvent;
			event.setParam(ImMensEvent.evtTypes.clear, undefined, undefined);
			visManager.fireEvent(event);
			return;
		}

		var xInVis = x - spec.getVisPosition().x, yInVis = y - spec.get("yFromTop");
		
		var brushFilter = {};
		if (spec.get("type") == VisSpec.HIST){
			var xBin = spec.pixToBin(xInVis, 0, true); //Math.floor( spec.get("startBins")[0] + xInVis /(spec.get("pixPerBin")) );
			
			//need to handle case where xBin is 
			var f = new DimInfo;
			f.setInfo( spec.get("cols")[0], spec.get("zmLevels")[0], xBin, xBin );
			brushFilter[spec.get("cols")[0]] = f;
			
		} else if (spec.get("type") == VisSpec.BAR){
			var yBin = spec.pixToBin(yInVis, 0, false); //Math.floor(spec.get("startBins")[0] + yInVis/(spec.get("pixPerBin")));
			var f = new DimInfo;
			f.setInfo(spec.get("cols")[0], spec.get("zmLevels")[0], yBin, yBin);
			brushFilter[spec.get("cols")[0]] = f;
			
		} else if (spec.get("type") == VisSpec.SP) {
			var xBin = spec.pixToBin(xInVis, 0, true);
			var yBin = spec.pixToBin(yInVis, 1, false);
			var hf = new DimInfo, vf = new DimInfo;
			hf.setInfo( spec.get("cols")[0], spec.get("zmLevels")[0], xBin, xBin );
			vf.setInfo( spec.get("cols")[1], spec.get("zmLevels")[1], yBin, yBin );
			brushFilter[spec.get("cols")[0]] = hf;
			brushFilter[spec.get("cols")[1]] = vf;
			//console.log(xBin, yBin);
		}
		
		var event = new ImMensEvent;
		event.setParam (ImMensEvent.evtTypes.brush, spec, brushFilter);
		visManager.fireEvent(event);
	},
	
	findResizable : function(plots, x, y){
		var spec = undefined;
		var plSize;
		for (var i in plots.get("visSpecs")){
			spec = plots.get("visSpecs")[i];
			plSize = spec.getPlaceHolderSize();
			if( spec.get("phx") <= x && spec.get("phx") + plSize.wd - 2 >= x && 
					spec.get("phy") + plSize.ht - 5  <= y && spec.get("phy") + plSize.ht + 2 >= y ){
				spec.set("resize", VisSpec.resize.ht);
				return spec;
			}
			if( spec.get("phx") + plSize.wd - 2 <= x && spec.get("phx") + plSize.wd + 2 >= x && 
					spec.get("phy")   <= y && spec.get("phy") + plSize.ht - 5 >= y ){
				spec.set("resize", VisSpec.resize.wd);
				return spec;
			}
		}
		
		return undefined;
	},
	
	getVisSpec : function(plots, x, y){
		var spec = undefined;
		var visSize, visPos;
		for (var i in plots.get("visSpecs")){
			spec = plots.get("visSpecs")[i];
			visSize = spec.getVisSize();
			visPos = spec.getVisPosition();
			if( visPos.x <= x && visPos.x + visSize.wd >= x && 
				spec.get("yFromTop") <= y && spec.get("yFromTop") + visSize.ht >= y ){
				return spec;
			}
		}
		return undefined;
	},
	
	updateRangeSlider : function(minV, maxV){
		var mgr = this;
//		$(function() {
//			$( "#" + mgr.get("colorMappingSliderID") ).slider({
//				range: true,
//				min: minV,
//				max: maxV,
//				values: [ minV, maxV ],
//				slide: function( event, ui ) {
//					//$( "#amount" ).val( "$" + ui.values[ 0 ] + " - $" + ui.values[ 1 ] );
//				}
//			});
		
		$( "#" + mgr.get("loValLabel") ).text(  minV.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")  );
		$( "#" + mgr.get("hiValLabel") ).text(  maxV.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") );
		// $( "#" + mgr.get("expParamID") ).slider({
		// 	min: 0,
		// 	max: 255,
		// 	value: 85,
		// 	step : 1,
		// 	slide: function( event, ui ) {
		// 		var event = new ImMensEvent;
		// 		event.setParam (ImMensEvent.evtTypes.repaintFg, undefined, undefined);
		// 		visManager.fireEvent(event);
		// 		//console.log( ui.values[ 0 ] + " " + ui.values[ 1 ] );
		// 	},
		// });
		$( "#" + mgr.get("colorMappingSliderID") ).slider({
			range: true,
			min: minV,
			max: maxV,
			values: [ minV, maxV ],
			slide: function( event, ui ) {
				$( "#" + mgr.get("loValLabel") ).text(  ui.values[ 0 ].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")  );
				$( "#" + mgr.get("hiValLabel") ).text(  ui.values[ 1 ].toFixed(0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")  );
				WebGLRenderer.bufferMin = ui.values[0]/255.0;
				WebGLRenderer.bufferMax = ui.values[1]/255.0;
				var event = new ImMensEvent;
				event.setParam (ImMensEvent.evtTypes.repaintBg, "color slider", ui.values[0]+"-"+ui.values[1]);
				visManager.fireEvent(event);
				event = new ImMensEvent;
				event.setParam (ImMensEvent.evtTypes.repaintFg, "color slider", ui.values[0]+"-"+ui.values[1]);
				visManager.fireEvent(event);
				//console.log( ui.values[ 0 ] + " " + ui.values[ 1 ] );
			},
		});
		
		
		
//			$( "#amount" ).val( "$" + $( "#slider-range" ).slider( "values", 0 ) +
//				" - $" + $( "#slider-range" ).slider( "values", 1 ) );
//		});
	},
	
	generateControls : function(){
		var ID = this.get("divID");
		if (d3.select("#"+ID).empty()){
			d3.select("body").append("div").attr("id", ID)
					.attr("style", "width: 100%; height: 25px; background-color: #e6e6e6; position: absolute; left: 0px; top: 0px; padding-top:15px;" );;
//			.attr("width",this.get("width")).attr("height",this.get("height"))
//			.attr("style", "position: absolute; left: " + this.get("x") + "px; top: " + this.get("y") + "px;");
		}
		
		// d3.select("#"+ID).append("span").text("exp").attr("style", " margin-left:20px; margin-right: 5px;" );

		// d3.select("#"+ID).append("span").attr("id", this.get("expParamID"))
		// 					.attr("style", "display: inline-block; width: 255px;" );
		
		d3.select("#"+ID).append("span").text("low").attr("id", this.get("loValLabel"))
							.attr("style", "text-align: right; display: inline-block; width: 50px; margin-left:20px; margin-right: 15px;" );
//		d3.select("#"+ID).append("input").attr("id", this.get("gColorID")).attr("type", "range")
//							.attr("style", "width: 153px; margin-top: 10px;" )
//							.attr("min", 0).attr("max", 153).property("value", 153)
//							.on("change", visManager.repaintGeoPlots);
		d3.select("#"+ID).append("span").attr("id", this.get("colorMappingSliderID"))
							.attr("style", "display: inline-block; width: 600px;" );
		d3.select("#"+ID).append("span").text("high").attr("id", this.get("hiValLabel"))
							.attr("style", "display: inline-block; width: 50px; margin-left:15px; margin-right: 40px;" );
		
		d3.select("#"+ID).append("input").property("checked", false).attr("type", "checkbox").on("click", visManager.toggleLogScale);
		d3.select("#"+ID).append("span").text("apply log scale (base E) to the histograms and bar charts")
							.attr("style", "margin-right: 40px;" );
		
		// d3.select("#"+ID).append("span").text("number of bytes per value on tile = " + parseFloat(4/DataManager.numPerPix))
		// 	.attr("style", " margin-left:20px; margin-right: 5px;" );
		
		//d3.select("#"+ID).append("input").attr("type", "button").attr("value","benchmark").on("click", benchmark);

	},
	
	getExpParam : function(){
		
		//return parseInt( d3.select("#"+this.get("expParamID")).property("value") );
		return $( "#"+this.get("expParamID") ).slider( "value" );
	},
	
	getLoV : function(){
		//return parseInt( d3.select("#"+this.get("colorMappingSliderID")).property("value") );
		return $( "#"+this.get("colorMappingSliderID") ).slider( "values", 0 );
	},
	
	getHiV : function(){
		//return parseInt( d3.select("#"+this.get("colorMappingSliderID")).property("value") );
		return $( "#"+this.get("colorMappingSliderID") ).slider( "values", 1 );
	},
	
	initialize : function(){
		this.set("divID", "visControls");
		this.set("expParamID", "visControls-Color");
		this.set("colorMappingSliderID", "visControls-Color-g");
		this.set("loValLabel", "loValLabel");
		this.set("hiValLabel", "hiValLabel");
		this.set("activeSpec", undefined);
		this.set("selectedSpec", undefined);
		//this.set("bColorID", "visControls-Color-b");
		this.set("maskOpacity", 0.7);
		this.set("dragMode", ActionManager.dragModes.none);
		//this.set("hiColorID", "visControls-hiColor");
		_.bindAll(this, 'onDrag');
		_.bindAll(this, 'endDrag');
		_.bindAll(this, 'selectArea');
		_.bindAll(this, 'pan');
	}
}, {
	dragModes: {pan: 0, resize: 1, select: 2, none: 3}
});