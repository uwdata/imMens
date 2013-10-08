var ImMensEvent = Backbone.Model.extend({
	
	setParam : function(type, source, value) {
		this.set({
			"type": type,
			"source": source,
			"value": value
		});
	},
	
	getType : function() {
		return this.get("type");
	},
	
	getSource : function() {
		return this.get("source");
	},
	
	getValue : function() {
		return this.get("value");
	},

	equals : function(evt){
		if (!evt)
			return false;

		return this.get("type") == evt.get("type") && this.get("source") == evt.get("source") 
				&& JSON.stringify(this.get("value")) == JSON.stringify(evt.get("value"));
	},

	toString : function(){
		return this.get("type") + " " + this.get("source") + " " + this.get("value");
	},
	
}, {
	evtTypes : {
		brush: 0, 
		rangeSelect: 1, 
		clear: 2,
		pan: 3,
		zoom: 4,
		repaintFg: 5,
		repaintBg: 6,
		adjustView : 7,
	}
});