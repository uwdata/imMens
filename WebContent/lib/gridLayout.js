var GridLayout = Backbone.Model.extend({
	
	/**
	 * @memberOf GridLayout
	 */
	findFreeSpace: function(wd, ht){
		var numRows = Math.ceil( ht/this.get("cellSize") ), numCols = Math.ceil( wd/this.get("cellSize") );
		var grid = this.get("grid"), plot = this.get("plot");
		for (var r = 0; r < this.get("numRows"); r++) {
			for (var c = 0; c < this.get("numCols") - numCols; c++) {
				
				if (grid[r][c] && grid[r][c + numCols]) {
					if ( r + numRows < this.get("numRows") ) {
						return [ c * this.get("cellSize"), // + this.get("xOffset"),
						         r * this.get("cellSize"), // + this.get("yOffset"), 
						        ];
					}
					else { //increase canvas size
						plot.updateHeight ( plot.get("height") + ht );
						this.set("height", plot.get("height") + ht);
						this.reGenerateGrid();
						this.relayout();
						
						return [ c * this.get("cellSize"), // + this.get("xOffset"),
						         r * this.get("cellSize"), // + this.get("yOffset"), 
							    ];
					}
				}
			
			}
		}
		return undefined;
	},
	
	reGenerateGrid: function(){
		var numRows = Math.ceil( this.get("height")/this.get("cellSize") );
		var numCols = Math.ceil( this.get("width")/this.get("cellSize") );
		
		var grid = [];
		var row;
		for (var r = 0; r < numRows; r++) {
			row = [];
			for (var c = 0; c < numCols; c++) {
				row.push(true);
			}
			grid.push(row);
		}
		this.set({
			"numRows": numRows,
			"numCols": numCols,
			"grid": grid
		});
		//console.log(grid);
	},
	
	relayout: function(){
		
		for (var r = 0; r < this.get("numRows"); r++) {
			for (var c = 0; c < this.get("numCols"); c++) {
				this.get("grid")[r][c] = true;
			}
		}
		
		var spec, sRow, eRow, sCol, eCol;
		var plSize, plPos;
		for (var s in this.get("visSpecs")){
			spec = this.get("visSpecs")[s];
			plSize = spec.getPlaceHolderSize();
			plPos = this.findFreeSpace(plSize.wd, plSize.ht);
			//console.log(spec.getSpecId(), plPos);
			spec.set({
				phx: plPos[0],
				phy: plPos[1],
				yFromTop: plPos[1] + VisSpec.topMargin,
			});
			spec.updateLabelLoc();
			
			sRow = Math.floor(plPos[1]/this.get("cellSize"));
			eRow = Math.ceil((plPos[1] + plSize.ht)/this.get("cellSize"));
			sCol = Math.floor(plPos[0]/this.get("cellSize"));
			eCol = Math.ceil((plPos[0] + plSize.wd)/this.get("cellSize"));
			
			for (var i = sRow; i <= eRow; i++) {
				for (var j = sCol; j <= eCol; j++) {
					this.get("grid")[i][j] = false;
				}
			}
		}

	},
	
	setParam: function(w, h, cs, xOff, yOff, plot){
		this.set({
			width: w,
			height: h,
			cellSize: cs,
			xOffset: xOff,
			yOffset: yOff,
			plot: plot
		});
	},
	
	

});