var VisManager = Backbone.Model.extend({
		
	/**
	 * @memberOf VisManager
	 */
	initPlots : function(id, x, y, width, height){
		
		this.set({
			plotX : x,
			plotY : y,
			plotWidth: width,
			plotHeight: height,
		});

		
		this.set("plots", new BinnedPlots({id:id, width:this.get("plotWidth") , height:this.get("plotHeight"), 
								x:this.get("plotX"), y:this.get("plotY"), axisSVG: id+"-axisSVG", })
			);
		this.get("plots").initPlot();
	
		this.get("gridLayout").set({
			"visSpecs": this.get("visSpecs"),
			"plot": this.get("plots"),
			});
		this.get("gridLayout").setParam(width, height, 20);
		this.get("gridLayout").reGenerateGrid();
		this.get("gridLayout").relayout();
		
		this.updatePlots();
	},
	
	drawPlaceHolder : function(spec){

		var phSize = spec.getPlaceHolderSize();
		d3.select("#"+this.get("plots").get("svgLayer")).append("svg:rect").attr("class", "placeholder")
		.attr("x", spec.get("phx") ).attr("y", spec.get("phy") )
		.attr("width", phSize.wd).attr("height", phSize.ht)
		.style("fill", spec.get("isPlaceHolder") ? "#fafafa" : "none")
		
		if (spec.get("isPlaceHolder")){
			
			d3.select("#"+this.get("plots").get("svgLayer")).append("text").attr("class", "placeholder")
				.text('Drag and drop columns here')
                .attr('fill', 'gray')	
                .attr("x", spec.get("phx") + 150).attr("y", spec.get("phy") + 50)
                .attr("width", phSize.wd).attr("height", phSize.ht)
			;
		}
	},
	
	

	//find existing vis
	findSpec: function(x, y, colmeta){
		var specs = this.get("visSpecs");
		var spec, phSize;
		
		for (var key in specs){
			spec = specs[key];
			phSize = spec.getPlaceHolderSize();
			
			if ( this.get("plotX") + spec.get("phx") <= x && this.get("plotY") + spec.get("phy") <= y 
					&& this.get("plotX") + spec.get("phx") + phSize.wd >= x 
					&& this.get("plotY") + spec.get("phy") + phSize.ht >= y) {
				return spec;
			}
				
		}
		return undefined;
	},
	
	//find available area to create new vis
	findPlaceHolder : function(x, y, colmeta){
		//var layout = this.get("layout");
		var size = this.getSpecSize(colmeta);
		
		var topleft = this.get("gridLayout").findFreeSpace(size[0], size[1], this.get("plots"));
		if (topleft) {
			return {x: topleft[0] + this.get("plotX"), y: topleft[1] + this.get("plotY"), wd: size[0], ht: size[1] };
		}
	},
	
	updateVisSpec : function(spec, colmeta){
		var vType = (colmeta["dType"]<=1 && dataManager.get("metadata")[spec.get("cols")[0]].dType<=1) ? VisSpec.GEO : VisSpec.SP;
		spec.set({
			type: vType,  
		}) ;
		
		spec.set("endBins", [ spec.get("startBins")[0] + dataManager.get("metadata")[spec.get("cols")[0]].binsPerTile - 1 ]);
		
		if (vType == VisSpec.GEO && colmeta["dim"] == DataManager.dataTypes.latitude) {
			spec.get("cols").unshift(colmeta["dim"]);
			spec.get("labels").unshift(colmeta["dimNm"]);
			spec.get("zmLevels").unshift(4);
			spec.get("startBins").unshift(colmeta["binStartValue"]);
			spec.get("endBins").unshift(colmeta["binStartValue"] + colmeta["binsPerTile"] - 1);
		}
		else {
			spec.get("cols").push(colmeta["dim"]);
			spec.get("labels").push(colmeta["dimNm"]);
			spec.get("zmLevels").push(0);
			spec.get("startBins").push(colmeta["binStartValue"]);
			spec.get("endBins").push(colmeta["binStartValue"] + colmeta["binsPerTile"] - 1);
		}
		
		//adjust width and height for binned scatter plot
		var pixPerBin = [];
		for (var i = 0; i < 2; i++) {
			if ( dataManager.get("metadata")[spec.get("cols")[i]].dType >=3 ) {
				pixPerBin.push(VisSpec.minBarSize);
			}
			else 
				pixPerBin.push(VisSpec.minCellSize);
		}
		
		spec.set("pixPerBin", pixPerBin);
		
		spec.set({
			phDfltWd: spec.get("pixPerBin")[0] * (spec.get("endBins")[0] - spec.get("startBins")[0] + 1) + VisSpec.yAxisWd + spec.getYAxisLblSize() + VisSpec.rightMargin,
			phDfltHt: spec.get("pixPerBin")[1] * (spec.get("endBins")[1] - spec.get("startBins")[1] + 1) + VisSpec.xAxisHt + spec.getXAxisLblSize() + VisSpec.topMargin,
			deltaX: 0,
			deltaY: 0,
		});
		
		var visSize = spec.getVisSize();
		spec.updateLabelLoc();
		spec.updateFBOSize();
		
		this.get("gridLayout").relayout();
		this.updatePlots(true);

	},
	
	getSpecSize: function(colmeta){
		
		var vType, phwd, phht;
		switch (colmeta["dType"]) {
			case 2:
				vType = VisSpec.HIST;
				phwd = this.getWdHt(colmeta, VisSpec.minBarSize, true, false);
				phht = 300;
				break;
			case 3:
				vType = VisSpec.BAR;
				phht = this.getWdHt(colmeta, VisSpec.minBarSize, false);
				phwd = 300;
				break;
			default:
				vType = VisSpec.HIST;
				phwd = this.getWdHt(colmeta, VisSpec.minBarSize, true, false);
				phht = 300;
				break;
		}
		
		return [phwd, phht];
	},
	
	getWdHt: function(colmeta, binWidth, isWd, hasYLbl){
		var extraSpace = isWd? VisSpec.rightMargin + VisSpec.yAxisWd : 
			VisSpec.topMargin + VisSpec.xAxisHt + VisSpec.labelSize;

		if (isWd && hasYLbl)	extraSpace += VisSpec.labelSize;
		
		var wd = binWidth * dataManager.get("metadata")[colmeta["dim"]].totalBinCnt + extraSpace ;
		if (wd > this.get("plotWidth")){
			wd = binWidth * dataManager.get("metadata")[colmeta["dim"]].binsPerTile * ( binWidth > 3 ? 1 : 2) + extraSpace;
		}
		
		if (wd > this.get("plotWidth"))
			wd = this.get("plotWidth");
		
		var gridSize = this.get("gridLayout").get("cellSize");
		return Math.floor(wd/gridSize) * gridSize;
	},
	
	addVisSpec : function (placeholder, colmeta, x, y){
		
		var vType, phwd, phht;
		var svgLayer = d3.select("#"+this.get("plots").get("svgLayer"));
		
		switch (colmeta["dType"]) {
		case 2:
			vType = VisSpec.HIST;
			phwd = this.getSpecSize(colmeta, VisSpec.minBarSize, true, false);
			phht = 300;
			break;
		case 3:
			vType = VisSpec.BAR;
			phht = this.getSpecSize(colmeta, VisSpec.minBarSize, false);
			phwd = 300;
			break;
		default:
			vType = VisSpec.HIST;
			phwd = this.getSpecSize(colmeta, VisSpec.minBarSize, true, false);
			phht = 300;
			break;
		}
		
		
		var specId = "S" + Object.keys(this.get("visSpecs")).length;
		var ph = this.findPlaceHolder(x, y, colmeta);
		
		var pos, temp;

		var spec = new VisSpec({ 
			phx: ph.x - this.get("plotX"),
			phy: ph.y - this.get("plotY"),
			phDfltWd: ph.wd,
			phDfltHt: ph.ht,
			deltaX: 0,
			deltaY: 0,
			yFromTop: ph.y - this.get("plotY") + VisSpec.topMargin, //y from top of canvas
			type: vType,  
			cols: [colmeta["dim"]],
			labels: [colmeta["dimNm"]],
		});
		
		spec.set({
			zmLevels: [0],
			startBins: [colmeta["binStartValue"]],
			endBins: [colmeta["binStartValue"] + colmeta["binsPerTile"] - 1]
		});
		
		if (spec.get("yFromTop") + spec.get("height") > this.get("plotY") + this.get("plotHeight")) {
			this.set("plotHeight", spec.get("yFromTop") + spec.get("height") + 50);
			this.get("plots").updateHeight();
		}
			
		//adjust bar width
		spec.updatePixPerBin();
		spec.updateFBOSize();
		spec.updateLabelLoc();
		
		this.get("visSpecs")[specId] = spec;
		d3.select("#hint").attr("style", "display:none;");
		
		this.get("gridLayout").relayout();
		this.updatePlots(true);
	},
	
	fireEvent : function(imEvt) {

		if (imEvt.equals(this.get("lastEvt")))
			return;
		this.set("lastEvt", imEvt);
		
		visManager.get("activeWkSheet").processEvent(imEvt);
	},
	
	updateWorkSheets: function(args){
		//active 
		this.get("activeWkSheet").updatePlot(args);
	},
	
	displayConstructionUI : function(){
		VisManager.updateStatus(false);
		//d3.selectAll(".spec").style("display","block");
		//generateTileSpecs();
		d3.select("body").append("div").attr("id", "schema").style("display","block");
		//d3.select("#container").style("display","block");
		if (d3.select("#vis").empty())
			this.initPlots("vis", 200, 10, 1150, 1200);
		
		d3.select("body").append("div").attr("id", "draggingColumn").attr("style", "display:none;");
		d3.select("body").append("div").attr("id", "dropArea").attr("style", "display:none;");
		d3.select("body").append("div").attr("id", "addDimension").attr("style", "display:none;");
		
		var schemaView = d3.select("#schema"); //.select("g");
		var vm = this;
		schemaView.selectAll("div").data(dataManager.get("metadata")).enter()
		.append("div")
		.text(function(d,i) { return d["dimNm"];})
		.attr("class", "schemaColumn")
		.call(d3.behavior.drag()
				.on("dragstart", function(d) {
					d3.select("#draggingColumn")
					.text( d["dimNm"] )
					.attr("style", "display:none;position:absolute;left:"+window.event.clientX+"px;top:"+window.event.clientY+"px;")
					;
				})
				.on("drag", function(d) {
					
					d3.select("#draggingColumn")
						.attr("style", "display:block;position:absolute;left:"+window.event.clientX+"px;top:"+window.event.clientY+"px;");
					
					if (!vm.insidePlot(window.event.clientX, window.event.clientY)){
						document.body.style.cursor="not-allowed";
						d3.select("#dropArea").attr("style", "display:none;");
						d3.select("#addDimension").attr("style", "display:none;");
						return;
					}
					
					var spec = vm.findSpec(window.event.clientX, window.event.clientY, d);
					if (spec && spec.get("cols").length == 1 && spec.get("cols")[0] != d.dim){
						document.body.style.cursor="none";
						d3.select("#addDimension")
							.attr("style", "display:block;position:absolute;left:"+window.event.clientX+"px;top:"+window.event.clientY+"px;");	
						var left = spec.get("phx") + vm.get("plotX"),
							top = spec.get("phy") + vm.get("plotY") + VisSpec.topMargin;
						var phSize = spec.getPlaceHolderSize();
						d3.select("#dropArea")
							.attr("style", "display:block;position:absolute;left:"+left+"px;top:"+top+"px;width:"+phSize.wd+"px;height:"+phSize.ht+"px;border:2px solid #75D175;");
					}
					else {
						document.body.style.cursor="default";
						d3.select("#addDimension").attr("style", "display:none;");
						var ph = vm.findPlaceHolder(window.event.clientX, window.event.clientY, d);
					
						if (!ph) {
							document.body.style.cursor="not-allowed";
							d3.select("#dropArea").attr("style", "display:none;");
						}
						else {
							document.body.style.cursor="default";
							d3.select("#dropArea")
								.attr("style", "display:block;position:absolute;left:"+ph.x+"px;top:"+ph.y+"px;width:"+ph.wd+"px;height:"+ph.ht+"px;border:2px solid #FFCCCC;");
						
						}
					}
				})
				.on("dragend", function(d) {
					
					d3.select("#draggingColumn").attr("style", "display:none;");
					d3.select("#dropArea").attr("style", "display:none;");
					d3.select("#addDimension").attr("style", "display:none;");
					document.body.style.cursor="default";
					var spec = vm.findSpec(window.event.clientX, window.event.clientY, d);
					if (spec && spec.get("cols").length == 1){
						vm.updateVisSpec(spec, d);
					}
					else if (vm.insidePlot(window.event.clientX, window.event.clientY)) {
						vm.addVisSpec(undefined, d, window.event.clientX, window.event.clientY);
					}
				}));;
		
		this.get("plots").updateFg();
	},
	
	insidePlot : function (x, y){
		if ( this.get("plotX")  <= x && this.get("plotY")  <= y 
				&& this.get("plotX") +  this.get("plotWidth") >= x 
				&& this.get("plotY") + this.get("plotHeight") >= y) {
			return true;
		}
		else
			return false;
	},
	
	defaults : function() {
		return {
			visSpecs: {},
			layout: {},
			timerId: undefined,
			imEvts: [],
			lastEvt : undefined,
		}
	},

	addWorkSheet : function() {
		var id = "ws" + Object.keys(this.get("wkSheets")).length;
		
		var ws = new WorkSheet({id:id, 
								width:1350, 
								height:700, 
								x:10, 
								y:40, 
								axisSVG: id+"-axisSVG", })
		ws.initPlot();
		
		this.get("wkSheets")[id] = ws;
		this.set("activeWkSheet", ws);
	},
	
	initialize : function() {
		if (!this.get("wkSheets")) {
			this.set({
				wkSheets : {},
			});
			//this.addWorkSheet();
		}
		
		//_.bindAll(this, 'repaintGeoPlots');
	},

	
	// repaintGeoPlots : function(){
	// 	var plots = this.get("charts");
	// 	for (var i = 0; i < plots.length; i++){
	// 		plots[i].get("fgRenderer").run();
	// 	}
	// },

	generateVisSpecs : function(){

		var specs = [];
		if (currentDataSet == 0){
			//geo
			specs.push(
					new VisSpec({ 
						phx: 5,
						phy: 0,
						phDfltWd: 1000,
						phDfltHt: 470,
						deltaX: 0,
						deltaY: 0,
						type: VisSpec.GEO,  
						cols: [0,1],
						zmLevels: [2,2],
						center: new L.LatLng(37.3295985,-97.1771705),
						bgmapTileSize: 256,
						pixPerBin: [2,2],
						//startBins: [296, 657], //projected lon first,projected lat
						//endBins: [767, 1023] 
					})
			); 
			
			specs.push(
					new VisSpec({ 
						type:VisSpec.HIST, 
						cols: [2],
						phx: 5,
						phy: 480,
						phDfltWd: 226,
						phDfltHt: 240,
						deltaX: 0,
						deltaY: 0,
						//labelLoc: [[1060, 45]],
						labels: ["Month"],
						// pixPerBin: [VisSpec.maxBarSize],
						// histGap: 1.0,
						zmLevels: [0],
						startBins: [0],
						//endBins: [11]
					})
			); 
			
			specs.push(
					new VisSpec({ 
						type:VisSpec.HIST,  
						cols: [3],
						phx: 240,
						phy: 480,
						phDfltWd: 381,
						phDfltHt: 240,
						deltaX: 0,
						deltaY: 0, 
						//labelLoc: [[1070, 40 + 190]],
						labels: ["Day"],
						// pixPerBin: [VisSpec.maxBarSize],
						// histGap: 1.0,
						zmLevels: [0],
						startBins: [0],
						//endBins: [30]
					})
			); 
			
			specs.push(
					new VisSpec({ 
						type:VisSpec.HIST,  
						cols: [4],
						phx: 630,
						phy: 480,
						phDfltWd: 380,
						phDfltHt: 240,
						deltaX: 0,
						deltaY: 0,
						//labelLoc: [[1070, 50 + 400]],
						labels: ["Hour"],
						// pixPerBin: [VisSpec.maxBarSize],
						// histGap: 1.0,
						zmLevels: [0],
						startBins: [0],
						//endBins: [23]
					})
			); 

			specs.push(
					new VisSpec({ 
						type:VisSpec.BAR,  
						cols: [5],
						phx: 1020,
						phy: 0,
						phDfltWd: 280,
						phDfltHt: 540,
						deltaX: 0,
						deltaY: 0,
						//labelLoc: [[1070, 50 + 400]],
						labels: ["Top 30 Travelers"],
						// pixPerBin: [VisSpec.maxBarSize],
						// histGap: 1.0,
						zmLevels: [1],
						startBins: [0],
						//endBins: [29]
					})
			); 

		} else if (currentDataSet == 1){
			specs.push(
					new VisSpec({ 
						phx: 5,
						phy: 0,
						phDfltWd: 502 + 85, //838,
						phDfltHt: 506 + 60, //819,
						deltaX: 0,
						deltaY: 0,
						type: VisSpec.SP,  
						cols: [0,1],
						zmLevels: [0,0],
						pixPerBin: [2,2],
						startBins: [0,0], //value, not bin number
						// startBins: [0, 0],
						// endBins: [250, 250],
						labels: ["Departure Delay (minutes)", "Arrival Delay (minutes)"],
					})
			); 

			specs.push(
					new VisSpec({ 
						type:VisSpec.BAR,  
						cols: [4],
						phx: 620,
						phy: 0,
						phDfltWd: 280,
						phDfltHt: 510,
						deltaX: 0,
						deltaY: 0,
						//labelLoc: [[1070, 50 + 400]],
						labels: ["Carriers"],
						pixPerBin: [12],
						zmLevels: [0],
						startBins: [0],
						histGap: 1.0,
						// endBins: [28]
					})
			);

			specs.push(
					new VisSpec({ 
						type:VisSpec.BAR,  
						cols: [2],
						phx: 930,
						phy: 0,
						phDfltWd: 380,
						phDfltHt: 300,
						deltaX: 0,
						deltaY: 0,
						//labelLoc: [[1070, 50 + 400]],
						labels: ["Year"],
						pixPerBin: [12],
						zmLevels: [0],
						startBins: [0],
						histGap: 1.0,
					})
			);

			specs.push(
					new VisSpec({ 
						type:VisSpec.HIST,  
						cols: [3],
						phx: 930,
						phy: 330,
						phDfltWd: 380,
						phDfltHt: 220,
						deltaX: 0,
						deltaY: 0,
						//labelLoc: [[1070, 50 + 400]],
						labels: ["Month"],
						pixPerBin: [12],
						zmLevels: [0],
						startBins: [0],
						histGap: 1.0,
					})
			);
		}
		
		//adjust bar width
		var spec;
		for (var i = 0; i < specs.length; i++){
			this.get("activeWkSheet").addVisSpec(specs[i]);
		}
		
		d3.select("#hint").attr("style", "display:none;");
		
		//this.get("gridLayout").relayout();
		//this.get("activeWkSheet").initDataTiles();
		this.get("activeWkSheet").updatePlot({recompute:true, relayout:true, prepareForZoom:true});
	},

	toggleLogScale : function(){
		VisManager.useLog = !VisManager.useLog;
		var event = new ImMensEvent;
		event.setParam (ImMensEvent.evtTypes.repaintBg, "log scale", VisManager.useLog);
		visManager.fireEvent(event);
		var event = new ImMensEvent;
		event.setParam (ImMensEvent.evtTypes.repaintFg, "log scale", VisManager.useLog);
		visManager.fireEvent(event);
	},

},{
	useLog : false,

	updateStatus : function(visible, msg){
		
		if (visible){
			if (!d3.select("#status").empty())
				d3.select("#status").remove();
			d3.select("body").append("div").attr("id", "status");
			d3.select("#status").style("display","block")
				.append("img").attr("src", "resources/loading-blue.gif").attr("style", "width: 50px; height: 50px; margin-bottom:10px;");
		}
		else
			d3.select("#status").style("display","none");
		
		if (msg)
			d3.select("#status").append("div").text(msg);
	}
});

