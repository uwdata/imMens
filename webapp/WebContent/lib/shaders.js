var Shaders = Backbone.Model.extend({
	/**
	 * @memberOf Shaders
	 */
	
},{
	/**
	 * @memberOf Shaders
	 */
	getRenderShader_4Byte : function(gl) {							
		var str =  "precision mediump float;							\
			uniform mediump sampler2D u_data;					\
			uniform mediump float u_texw, u_texh;						\
            uniform mediump float u_localMax, u_globalMax, u_bufferMax, u_avgPix, u_bufferMin;            \
			uniform mediump vec2 u_pixOffsets, u_containerPos;						\
			uniform mediump float u_loV, u_hiV, u_exp;					\
			uniform mediump float u_texIdx;							\
			uniform mediump vec2 u_cols, u_pixOrigin;						\
			uniform mediump vec2 u_binCnts;				\
			uniform mediump float u_xLoc, u_yLoc, u_visXPos, u_visYPos;									\
			uniform mediump float u_xBinPixWd, u_yBinPixWd;												\
			uniform mediump float u_visTileWd, u_visTileHt, u_canvasWd, u_plotsHt, u_zm, u_visibleTileWd, u_visibleTileHt;					\
			uniform mediump float u_1dPlotHt, u_histGap, u_visType;			\
			uniform bool u_isBg, u_isInvert, u_yIsTopBtm, u_useLog;											\
			mediump float iu, iv, fz, mz, texIdx;											\
			uniform mediump vec3 u_histColor;													\
			mediump vec4 v;													\
			\
			mediump float chg(mediump float x) {		\
				return pow(x, 0.33);			\
			}	\
			mediump vec4 getColorYellowRed(mediump float x, mediump float y) {		\
				vec4 v = texture2D(u_data, vec2(x, y));										\
				mediump float sum = v.a * 16777216.0 + v.b * 65536.0 + v.g * 256.0 + v.r;	 \
				if (sum == 0.0)				{						\
					discard;											\
				}										\
				mediump float hiG = 1.0, loG = 0.0;													\
				mediump float hiB = 0.7, loB = 0.0;					\
				if (sum <= u_loV)	return vec4(1.0, hiG, hiB, 1.0);									\
				else if (sum > u_hiV)	return vec4(1.0, loG, loB, 1.0);										\
				mediump float ratio =  (sum - u_loV)/(u_hiV - u_loV);			\
				ratio = min(1.0, pow(ratio, u_exp));			\
				return vec4(1.0,  hiG - ratio*(hiG-loG),  hiB - ratio*(hiB-loB), 1.0);				\
			} 														\
			\
			mediump vec4 getColorGold(mediump float x, mediump float y) {		\
				vec4 v = texture2D( u_data, vec2( x, y ));										\
				mediump float sum = v.a * 16777216.0 + v.b * 65536.0 + v.g * 256.0 + v.r;	 \
				if (sum == 0.0)	{						\
					discard;											\
				}										\
				mediump float hiG = 0.5, hiB = 0.0;     						\
				mediump float loG = 0.9608, loB = 0.8;        					\
				if (sum <= u_loV)	return vec4(1.0, loG, loB, 1.0);									\
				else if (sum > u_hiV)	return vec4(1.0, hiG, hiB, 1.0);										\
				mediump float ratio =  (sum - u_loV)/(u_hiV - u_loV);			\
				ratio = min(1.0, pow(ratio, u_exp));			\
				return vec4(1.0, loG - ratio * (loG - hiG), loB - ratio * (loB - hiB), 1.0);			\
			} 														\
			\
			mediump vec4 getColorGreen(mediump float x, mediump float y) {		\
				vec4 v = texture2D(u_data, vec2(x, y));										\
				mediump float sum = v.a * 16777216.0 + v.b * 65536.0 + v.g * 256.0 + v.r;	 \
				if (sum == 0.0)				{						\
					return vec4(0.0,0.0,0.0,1.0);											\
				}										\
				mediump float hiR = 0.2, hiG = 0.4, hiB = 0.2;     						\
				mediump float loR = 0.8667, loG = 0.9333, loB = 0.8667;        					\
				if (sum <= u_loV)	return vec4(loR, loG, loB, 1.0);									\
				else if (sum > u_hiV)	return vec4(hiR, hiG, hiB, 1.0);										\
				mediump float ratio =  (sum - u_loV)/(u_hiV - u_loV);			\
				ratio = min(1.0, pow(ratio, u_exp));			\
				return vec4(loR - ratio * (loR - hiR), loG - ratio * (loG - hiG), loB - ratio * (loB - hiB), 1.0);			\
			} 														\
			\
			mediump vec4 getColorSteelBlue(mediump float x, mediump float y) { 			\
				vec4 v = texture2D(u_data, vec2(x, y));										\
				mediump float sum = v.a * 16777216.0 + v.b * 65536.0 + v.g * 256.0 + v.r;	 \
				if (sum == 0.0) {						\
					discard;											\
				}										\
				mediump float hiR = 0.2745, hiG = 0.5098, hiB = 0.7059;     						\
				mediump float loR = 0.9137, loG = 0.9412, loB = 0.9647;        					\
				if (sum <= u_loV)	return vec4(loR, loG, loB, 1.0);									\
				else if (sum > u_hiV)	return vec4(hiR, hiG, hiB, 1.0);										\
				mediump float ratio = (sum - u_loV)/(u_hiV - u_loV);			\
				ratio = min(1.0, pow(ratio, u_exp));			\
				return vec4(loR - ratio * (loR - hiR), loG - ratio * (loG - hiG), loB - ratio * (loB - hiB), 1.0);				\
			}																		\
			\
			mediump vec4 getColorAlpha(mediump float x, mediump float y) { 			\
				vec4 v = texture2D(u_data, vec2(x, y));										\
				mediump float sum = v.a * 16777216.0 + v.b * 65536.0 + v.g * 256.0 + v.r;	 \
				if (sum == 0.0) {						\
					discard;											\
				}										\
				if (sum <= u_loV)	return vec4(0.27, 0.51, 0.71, 0.35);									\
				else if (sum > u_hiV)	return vec4(0.27, 0.51, 0.71, 1.0);										\
				mediump float ratio =  (sum - u_loV)/(u_hiV - u_loV);			\
				ratio = min(1.0, pow(ratio, u_exp));			\
				return vec4(0.27, 0.51, 0.71, 0.35 + ratio * 0.65);				\
			}																		\
			\
			void main() {									\
				mediump float x = gl_FragCoord.x - 0.5 - u_visXPos ;		\
				mediump float yFromTop = u_plotsHt - u_visYPos - gl_FragCoord.y + 0.5 ;			\
				if (x < 0.0 || x > u_canvasWd)	discard;			\
				if (u_visType == 0.0) {	\
					if (x < u_containerPos[0] || x > u_containerPos[0] + u_visibleTileWd)	discard;			\
					mediump float y = gl_FragCoord.y - ( u_plotsHt - u_visYPos - u_1dPlotHt) - 0.5 ;			\
					if (mod(x, u_xBinPixWd) <= u_histGap/2.0 ||  mod (x, u_xBinPixWd)  >= u_xBinPixWd - u_histGap/2.0)						\
						discard;	\
					mediump float xBin = floor((x + u_pixOffsets[0] - u_containerPos[0])/u_xBinPixWd);			\
					if (xBin < 0.0 || xBin > u_binCnts[0] - 1.0) {			\
						discard;									\
					}														\
					iu = (xBin + u_xLoc)/u_texw;								\
					iv = u_yLoc/u_texh;							\
					vec4 v = texture2D(u_data, vec2(iu, iv));			\
					mediump float sum = v.a * 16777216.0 + v.b * 65536.0 + v.g * 256.0 + v.r; \
					\
					if (sum == 0.0)	 discard;												\
					mediump float frac = u_useLog? log(sum+1.0)/log(u_bufferMax+1.0) : sum/u_bufferMax;	\
					if (y > frac * u_1dPlotHt)								\
						discard;				\
					else													\
						gl_FragColor = vec4(u_histColor[0], u_histColor[1], u_histColor[2], 1.0);	\
				} else if (u_visType == 4.0) {										\
					mediump float y = u_plotsHt - u_visYPos - gl_FragCoord.y + 0.5;	\
					if (mod(y, u_yBinPixWd) <= u_histGap/2.0 ||  mod (y, u_yBinPixWd )  >= u_yBinPixWd - u_histGap/2.0)						\
						discard;	\
					mediump float bin = floor((y + u_pixOffsets[1] - u_containerPos[1]) / u_yBinPixWd);	\
					if (bin < 0.0 || bin > u_binCnts[0] - 1.0){			\
								discard;									\
					}														\
					iu = (bin + u_xLoc)/u_texw;								\
					iv = u_yLoc/u_texh;							\
					vec4 v = texture2D(u_data, vec2(iu, iv));			\
					mediump float sum = v.a * 16777216.0 + v.b * 65536.0 + v.g * 256.0 + v.r; \
					\
					if (sum == 0.0)	discard;							\
					mediump float frac = u_useLog? log(sum+1.0)/log(u_bufferMax+1.0) : sum/u_bufferMax;	\
					if (x > frac * u_canvasWd)								\
						discard;				\
					else													\
						gl_FragColor = vec4(u_histColor[0], u_histColor[1], u_histColor[2], 1.0);	\
				}											\
				else if (u_visType == 2.0) {					\
					mediump float y = u_plotsHt - u_visYPos - gl_FragCoord.y + 0.5 ;			\
					if (x < u_containerPos[0] || x > u_containerPos[0] + u_visibleTileWd || y < u_containerPos[1]  || y > u_containerPos[1] + u_visibleTileHt) discard;\
					mediump float xBin = floor((x + u_pixOffsets[0] - u_containerPos[0])* (u_binCnts[0]-1.0) / u_visTileWd);			\
					mediump float yBin = u_yIsTopBtm ? floor((y + u_pixOffsets[1] - u_containerPos[1]) * (u_binCnts[1] - 1.0) / u_visibleTileHt) :	\
							floor((u_visTileHt - (y + u_pixOffsets[1] - u_containerPos[1])) * (u_binCnts[1] - 1.0) / u_visTileHt);	\
					mediump float xPo = u_isInvert? (yBin + u_xLoc)/u_texw : (xBin + u_xLoc)/u_texw;			\
					mediump float yPo = u_isInvert? (xBin + u_yLoc)/u_texh : (yBin + u_yLoc)/u_texh;			\
					gl_FragColor = u_isBg? getColorSteelBlue(xPo, yPo) : getColorGold(xPo, yPo);			\
				}											\
				else if (u_visType == 3.0){										\
					mediump float y = u_plotsHt - u_visYPos - gl_FragCoord.y + 0.5 ;			\
					if (x < u_containerPos[0] || x > u_containerPos[0] + u_visibleTileWd || y < u_containerPos[1]  || y > u_containerPos[1] + u_visibleTileHt) discard;\
					mediump float xBin = floor((x + u_pixOffsets[0] - u_containerPos[0]) * (u_binCnts[0]-1.0) / u_visTileWd);			\
					mediump float yBin = floor((y + u_pixOffsets[1] - u_containerPos[1]) * (u_binCnts[1]-1.0) / u_visTileHt);	\
					gl_FragColor =  getColorYellowRed((xBin + u_xLoc)/u_texw , (yBin + u_yLoc)/u_texh);	\
				}											\
			}																	\
			";	
//		if ( x == u_containerPos[0] + u_visibleTileWd - 1.0 || y == u_containerPos[1] + u_visibleTileHt - 1.0 ) {\
//			gl_FragColor = vec4( 0.0, 1.0, 1.0, 1.0);				\
//			return;			\
//		}					\
//		
		var shader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(shader, str);
		gl.compileShader(shader);
		if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) == 0)
		  alert(gl.getShaderInfoLog(shader));
		return shader;
	},

	getQueryShader3D_4Bytes : function(gl){
		var str =  "precision mediump float;							\
					uniform mediump float u_numTiles;							\
					uniform mediump sampler2D u_data0, u_data1, u_data2, u_data3;					\
					uniform mediump vec2 u_cols;						\
					uniform mediump float u_texw0, u_texw1, u_texw2, u_texw3;						\
					uniform vec4 u_binCnts, u_offsets;							\
					uniform mediump float u_xLoc, u_yLoc;									\
					uniform mediump vec4 u_lo0, u_lo1, u_lo2, u_lo3, u_hi0, u_hi1, u_hi2, u_hi3;										\
					uniform mediump float u_maxCnt;											\
					\
					float calculateSumHist(float binIdx, float col, float tileIdx) {								\
						mediump float  sum = 0.0;										\
						mediump vec4 u_low = tileIdx == 0.0 ? u_lo0 : tileIdx == 1.0 ? u_lo1 : tileIdx == 2.0 ? u_lo2 : u_lo3; 	\
						mediump vec4 u_hi = tileIdx == 0.0 ? u_hi0 : tileIdx == 1.0 ? u_hi1 : tileIdx == 2.0 ? u_hi2 : u_hi3; 	\
						mediump float lo = col == 0.0 ? u_low[0] : col == 1.0 ? u_low[1] : u_low[2];		\
						mediump float hi = col == 0.0 ? u_hi[0] : col == 1.0 ? u_hi[1] : u_hi[2];		\
						if (binIdx < lo || binIdx >= hi) {        															\
							return sum;																						\
						}																									\
						mediump float alpha = -1.0, beta = -1.0;								\
						mediump vec3 cols = vec3(0.0, 1.0, 2.0);						\
						for (mediump float i = 0.0; i < 3.0; i++) {							\
							if (i == col)	continue;						\
							else if (alpha == -1.0)	alpha = i;							\
							else beta = i;							\
						}																\
						mediump float offset = col == 0.0 ? u_offsets[0] : col == 1.0 ? u_offsets[1] : u_offsets[2];		\
						mediump float binCnt = col == 0.0 ? u_binCnts[0] : col == 1.0 ? u_binCnts[1] : u_binCnts[2];		\
						mediump float alphaOffset = alpha == 0.0 ? u_offsets[0] : alpha == 1.0 ? u_offsets[1] : u_offsets[2];    \
						mediump float betaOffset = beta == 0.0 ? u_offsets[0] : beta == 1.0 ? u_offsets[1] : u_offsets[2];		\
						mediump float alphaLo = alpha == 0.0 ? u_low[0] : alpha == 1.0 ? u_low[1] : u_low[2];		\
						mediump float alphaHi = alpha == 0.0 ? u_hi[0] : alpha == 1.0 ? u_hi[1] : u_hi[2];		\
						mediump float betaLo = beta == 0.0 ? u_low[0] : beta == 1.0 ? u_low[1] : u_low[2];		\
						mediump float betaHi = beta == 0.0 ? u_hi[0] : beta == 1.0 ? u_hi[1] : u_hi[2];		\
						\
						mediump float texIdx, iu, iv, fz, mz;								\
						mediump float ir, jr;								\
						mediump vec4 v;	\
						mediump float start = binIdx * offset;				\
						mediump float u_texw = tileIdx == 0.0 ? u_texw0 : tileIdx == 1.0 ? u_texw1 : tileIdx == 2.0 ? u_texw2 : u_texw3; 	\
						for (mediump float i = 0.0; i < 1000000.0; i++) {							\
							ir = i + alphaLo;													\
							if (ir >= alphaHi) break;											\
							for (mediump float j = 0.0; j < 1000000.0; j++){						\
								jr = j + betaLo;												\
								if (jr >= betaHi)		break;									\
								texIdx = start + ir*alphaOffset + jr*betaOffset; \
								fz = floor(texIdx/4.0);						\
								mz = mod(texIdx, 4.0);						\
								iu = mod(texIdx, u_texw)/u_texw;							\
								iv = floor(texIdx/u_texw)/u_texw;							\
								v = tileIdx == 0.0 ? texture2D(u_data0, vec2(iu, iv)) : tileIdx == 1.0 ? texture2D(u_data1, vec2(iu, iv)) : tileIdx == 2.0 ? texture2D(u_data2, vec2(iu, iv)) : texture2D(u_data3, vec2(iu, iv)); 	\
								sum += (v.a - 128.0/255.0) * 16777216.0 + v.r * 65536.0 + v.g * 256.0 + v.b;							\
							}																	\
						}																	\
						return sum;													\
					}																\
					\
					float calculateSumHeatmap(float xBinIdx, float yBinIdx, float hCol, float vCol, float tileIdx) {							\
						mediump float  sum = 0.0;							\
						mediump vec4 u_lo = tileIdx == 0.0 ? u_lo0 : tileIdx == 1.0 ? u_lo1 : tileIdx == 2.0 ? u_lo2 : u_lo3; 	\
						mediump vec4 u_hi = tileIdx == 0.0 ? u_hi0 : tileIdx == 1.0 ? u_hi1 : tileIdx == 2.0 ? u_hi2 : u_hi3; 	\
						mediump float xLo = hCol == 0.0 ? u_lo[0] : hCol == 1.0 ? u_lo[1]  : u_lo[2];		\
						mediump float xHi = hCol == 0.0 ? u_hi[0] : hCol == 1.0 ? u_hi[1]  : u_hi[2];		\
						mediump float yLo = vCol == 0.0 ? u_lo[0] : vCol == 1.0 ? u_lo[1]  : u_lo[2];		\
						mediump float yHi = vCol == 0.0 ? u_hi[0] : vCol == 1.0 ? u_hi[1]  : u_hi[2];		\
						if (xBinIdx < xLo || xBinIdx >= xHi || yBinIdx < yLo || yBinIdx >= yHi) {        															\
							return sum;																						\
						}																	\
						mediump float xOffset = hCol == 0.0 ? u_offsets[0] : hCol == 1.0 ? u_offsets[1] : u_offsets[2];		\
						mediump float yOffset = vCol == 0.0 ? u_offsets[0] : vCol == 1.0 ? u_offsets[1] : u_offsets[2];		\
						mediump float xBinCnt = hCol == 0.0 ? u_binCnts[0] : hCol == 1.0 ? u_binCnts[1] : u_binCnts[2];		\
						mediump float yBinCnt = vCol == 0.0 ? u_binCnts[0] : vCol == 1.0 ? u_binCnts[1] : u_binCnts[2];		\
						mediump float alpha = -1.0;								\
						mediump vec3 cols = vec3(0.0, 1.0, 2.0);						\
						for (mediump float i = 0.0; i < 3.0; i++) {							\
							if (i == hCol || i == vCol)	continue;						\
							else alpha = i;							\
						}																\
						mediump float alphaOffset = alpha == 0.0 ? u_offsets[0] : alpha == 1.0 ? u_offsets[1] : u_offsets[2];    \
						mediump float alphaLo = alpha == 0.0 ? u_lo[0] : alpha == 1.0 ? u_lo[1] : u_lo[2];		\
						mediump float alphaHi = alpha == 0.0 ? u_hi[0] : alpha == 1.0 ? u_hi[1] : u_hi[2];		\
						mediump float texIdx, iu, iv, fz, mz;								\
						mediump float ir;											\
						mediump vec4 v;	\
						mediump float u_texw = tileIdx == 0.0 ? u_texw0 : tileIdx == 1.0 ? u_texw1 : tileIdx == 2.0 ? u_texw2 : u_texw3; 	\
						mediump float start = xBinIdx * xOffset + yBinIdx * yOffset;				\
						for (mediump float i = 0.0; i < 1000000.0; i++) {							\
							ir = i + alphaLo;													\
							if (ir > alphaHi) break;											\
							texIdx = start + ir*alphaOffset; 				\
							fz = floor(texIdx/4.0);						\
							mz = mod(texIdx, 4.0);						\
							iu = mod(texIdx, u_texw)/u_texw;							\
							iv = floor(texIdx/u_texw)/u_texw;							\
							v = tileIdx == 0.0 ? texture2D(u_data0, vec2(iu, iv)) : tileIdx == 1.0 ? texture2D(u_data1, vec2(iu, iv)) : tileIdx == 2.0 ? texture2D(u_data2, vec2(iu, iv)) : texture2D(u_data3, vec2(iu, iv)); 	\
							sum += (v.a - 128.0/255.0) * 16777216.0 + v.r * 65536.0 + v.g * 256.0 + v.b;				\
						}																		\
						return sum;																\
					}													\
					\
					void main() {									\
						mediump float x = gl_FragCoord.x - 0.5;							\
						mediump float y = gl_FragCoord.y - 0.5;							\
						mediump float hCol = u_cols[0] <= u_cols[1] ? u_cols[0] : u_cols[1];								\
						mediump float vCol = u_cols[0] <= u_cols[1] ? u_cols[1] : u_cols[0];								\
						mediump float maxhBinCnt = hCol == 0.0? u_binCnts[0] : hCol == 1.0? u_binCnts[1] : u_binCnts[2];					\
						mediump float maxvBinCnt = vCol == 0.0? u_binCnts[0] : vCol == 1.0? u_binCnts[1] : u_binCnts[2];					\
						if (x < u_xLoc || x > u_xLoc + maxhBinCnt || y > u_yLoc + maxvBinCnt || y < u_yLoc) {										\
							discard;												\
						}																\
						mediump float c;											\
						if (hCol == vCol){										\
							mediump float rawC = 0.0;								\
							for (mediump float i = 0.0; i < 5.0; i++) {					\
								if (i >= u_numTiles)	break;							\
								rawC += calculateSumHist(x - u_xLoc, hCol, i);						\
							}	\
							c = rawC * 255.0;	\
						}														\
						else {													\
							mediump float rawC = 0.0;									\
							for (mediump float i = 0.0; i < 100.0; i++) {					\
								if (i >= u_numTiles)	break;							\
								rawC += calculateSumHeatmap(x - u_xLoc, y - u_yLoc, hCol, vCol, i);	\
							}	\
							c = rawC * 255.0;						\
						}														\
						\
						mediump float a = mod(c, 256.0);		\
						mediump float b = floor(mod(c, 65536.0)/256.0);		\
						mediump float g = floor(mod(c, 16777216.0)/65536.0);		\
						mediump float r = floor(c/16777216.0);						\
						gl_FragColor = vec4(r/255.0,g/255.0,b/255.0,a/255.0);		\
					}													\
					";
		var shader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(shader, str);
		gl.compileShader(shader);
		if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) == 0)
		  alert(gl.getShaderInfoLog(shader));
		return shader;
	},
	
	
	getQueryShader3D_2Bytes : function(gl) {
		var str =  "precision mediump float;							\
			uniform mediump float u_numTiles;							\
			uniform mediump sampler2D u_data0, u_data1, u_data2, u_data3, u_data4, u_data5;					\
			uniform mediump vec2 u_cols;						\
			uniform mediump float u_texw0, u_texw1, u_texw2, u_texw3, u_texw4, u_texw5;						\
			uniform vec4 u_binCnts, u_offsets;							\
			uniform mediump float u_xLoc, u_yLoc;									\
			uniform mediump float u_factor;										\
			uniform mediump vec4 u_lo0, u_lo1, u_lo2, u_lo3, u_lo4, u_lo5, u_hi0, u_hi1, u_hi2, u_hi3, u_hi4, u_hi5;										\
			uniform mediump float u_maxCnt;											\
			\
			float calculateSumHist(float binIdx, float col, float tileIdx){								\
				mediump float sum = 0.0;										\
				mediump vec4 u_low = tileIdx == 0.0 ? u_lo0 : tileIdx == 1.0 ? u_lo1 : tileIdx == 2.0 ? u_lo2 : tileIdx == 3.0 ? u_lo3 : tileIdx == 4.0 ? u_lo4 : u_lo5; 	\
				mediump vec4 u_hi = tileIdx == 0.0 ? u_hi0 : tileIdx == 1.0 ? u_hi1 : tileIdx == 2.0 ? u_hi2 : tileIdx == 3.0 ? u_hi3 : tileIdx == 4.0 ? u_hi4:  u_hi5; 	\
				mediump float lo = col == 0.0 ? u_low[0] : col == 1.0 ? u_low[1] : u_low[2];		\
				mediump float hi = col == 0.0 ? u_hi[0] : col == 1.0 ? u_hi[1] : u_hi[2];		\
				if (binIdx < lo || binIdx > hi){        															\
					return sum;																						\
				}																									\
				mediump float alpha = -1.0, beta = -1.0;								\
				mediump vec3 cols = vec3(0.0, 1.0, 2.0);						\
				for (mediump float i = 0.0; i < 3.0; i++){							\
					if (i == col)	continue;						\
					else if (alpha == -1.0)	alpha = i;							\
					else beta = i;							\
				}																\
				mediump float offset = col == 0.0 ? u_offsets[0] : col == 1.0 ? u_offsets[1] : u_offsets[2];		\
				mediump float binCnt = col == 0.0 ? u_binCnts[0] : col == 1.0 ? u_binCnts[1] : u_binCnts[2];		\
				mediump float alphaOffset = alpha == 0.0 ? u_offsets[0] : alpha == 1.0 ? u_offsets[1] : u_offsets[2];    \
				mediump float betaOffset = beta == 0.0 ? u_offsets[0] : beta == 1.0 ? u_offsets[1] : u_offsets[2];		\
				mediump float alphaLo = alpha == 0.0 ? u_low[0] : alpha == 1.0 ? u_low[1] : u_low[2];		\
				mediump float alphaHi = alpha == 0.0 ? u_hi[0] : alpha == 1.0 ? u_hi[1] : u_hi[2];		\
				mediump float betaLo = beta == 0.0 ? u_low[0] : beta == 1.0 ? u_low[1] : u_low[2];		\
				mediump float betaHi = beta == 0.0 ? u_hi[0] : beta == 1.0 ? u_hi[1] : u_hi[2];		\
				\
				mediump float texIdx, iu, iv, fz, mz;								\
				mediump float ir, jr;								\
				mediump vec4 v;									\
				mediump float start = binIdx * offset;				\
				mediump float u_texw = tileIdx == 0.0 ? u_texw0 : tileIdx == 1.0 ? u_texw1 : tileIdx == 2.0 ? u_texw2 : tileIdx == 3.0 ? u_texw3 : tileIdx == 4.0 ? u_texw4 : u_texw5; 	\
				for (mediump float i = 0.0; i < 260.0; i++){							\
					ir = i + alphaLo;													\
					if (ir > alphaHi) break;											\
					for (mediump float j = 0.0; j < 260.0; j++){						\
						jr = j + betaLo;												\
						if (jr > betaHi)		break;									\
						texIdx = start + ir*alphaOffset + jr*betaOffset; \
						fz = floor(texIdx/2.0);						\
						mz = mod(texIdx, 2.0);						\
						iu = mod(fz, u_texw)/u_texw;							\
						iv = floor(fz/u_texw)/u_texw;							\
						v = tileIdx == 0.0 ? texture2D(u_data0, vec2(iu, iv)) : tileIdx == 1.0 ? texture2D(u_data1, vec2(iu, iv)) : tileIdx == 2.0 ? texture2D(u_data2, vec2(iu, iv)) : tileIdx == 3.0 ? texture2D(u_data3, vec2(iu, iv)) : tileIdx == 4.0 ? texture2D(u_data4, vec2(iu, iv)) : texture2D(u_data5, vec2(iu, iv)); 	\
						sum += mz == 0.0 ? v.g * 256.0 +  v.r : v.a * 256.0 + v.b;							\
					}																	\
				}																	\
				return sum;													\
			}																\
			\
			float calculateSumHeatmap(float xBinIdx, float yBinIdx, float hCol, float vCol, float tileIdx){							\
				mediump float  sum = 0.0;							\
				mediump vec4 u_lo = tileIdx == 0.0 ? u_lo0 : tileIdx == 1.0 ? u_lo1 : tileIdx == 2.0 ? u_lo2 : tileIdx == 3.0 ? u_lo3 : tileIdx == 4.0 ? u_lo4 : u_lo5; 	\
				mediump vec4 u_hi = tileIdx == 0.0 ? u_hi0 : tileIdx == 1.0 ? u_hi1 : tileIdx == 2.0 ? u_hi2 : tileIdx == 3.0 ? u_hi3 : tileIdx == 4.0 ? u_hi4:  u_hi5; 	\
				mediump float xLo = hCol == 0.0 ? u_lo[0] : hCol == 1.0 ? u_lo[1] : u_lo[2];		\
				mediump float xHi = hCol == 0.0 ? u_hi[0] : hCol == 1.0 ? u_hi[1] : u_hi[2];		\
				mediump float yLo = vCol == 0.0 ? u_lo[0] : vCol == 1.0 ? u_lo[1] : u_lo[2];		\
				mediump float yHi = vCol == 0.0 ? u_hi[0] : vCol == 1.0 ? u_hi[1] : u_hi[2];		\
				if (xBinIdx < xLo || xBinIdx > xHi || yBinIdx < yLo || yBinIdx > yHi){        															\
					return sum;																						\
				}																	\
				mediump float xOffset = hCol == 0.0 ? u_offsets[0] : hCol == 1.0 ? u_offsets[1] : u_offsets[2];		\
				mediump float yOffset = vCol == 0.0 ? u_offsets[0] : vCol == 1.0 ? u_offsets[1] : u_offsets[2];		\
				mediump float xBinCnt = hCol == 0.0 ? u_binCnts[0] : hCol == 1.0 ? u_binCnts[1] : u_binCnts[2];		\
				mediump float yBinCnt = vCol == 0.0 ? u_binCnts[0] : vCol == 1.0 ? u_binCnts[1] : u_binCnts[2];		\
				mediump float alpha = -1.0;								\
				mediump vec3 cols = vec3(0.0, 1.0, 2.0);						\
				for (mediump float i = 0.0; i < 3.0; i++){							\
					if (i == hCol || i == vCol)	continue;						\
					else alpha = i;							\
				}																\
				mediump float alphaOffset = alpha == 0.0 ? u_offsets[0] : alpha == 1.0 ? u_offsets[1] : u_offsets[2];    \
				mediump float alphaLo = alpha == 0.0 ? u_lo[0] : alpha == 1.0 ? u_lo[1] : u_lo[2];		\
				mediump float alphaHi = alpha == 0.0 ? u_hi[0] : alpha == 1.0 ? u_hi[1] : u_hi[2];		\
				mediump float texIdx, iu, iv, fz, mz;								\
				mediump float ir;											\
				mediump vec4 v;	\
				mediump float u_texw = tileIdx == 0.0 ? u_texw0 : tileIdx == 1.0 ? u_texw1 : tileIdx == 2.0 ? u_texw2 : tileIdx == 3.0 ? u_texw3 : tileIdx == 4.0 ? u_texw4 : u_texw5; 	\
				mediump float start = xBinIdx * xOffset + yBinIdx * yOffset;				\
				for (mediump float i = 0.0; i < 50.0; i++){							\
					ir = i + alphaLo;													\
					if (ir > alphaHi) break;											\
					texIdx = start + ir*alphaOffset; 				\
					fz = floor(texIdx/2.0);						\
					mz = mod(texIdx, 2.0);						\
					iu = mod(fz, u_texw)/u_texw;							\
					iv = floor(fz/u_texw)/u_texw;							\
					v = tileIdx == 0.0 ? texture2D(u_data0, vec2(iu, iv)) : tileIdx == 1.0 ? texture2D(u_data1, vec2(iu, iv)) : tileIdx == 2.0 ? texture2D(u_data2, vec2(iu, iv)) : tileIdx == 3.0 ? texture2D(u_data3, vec2(iu, iv)) : tileIdx == 4.0 ? texture2D(u_data4, vec2(iu, iv)) : texture2D(u_data5, vec2(iu, iv)); 	\
					sum += mz == 0.0 ? v.g * 256.0 + v.r : v.a * 256.0 + v.b;				\
				}																		\
				return sum;																\
			}													\
			\
			void main() {									\
				mediump float x = gl_FragCoord.x - 0.5;							\
				mediump float y = gl_FragCoord.y - 0.5;							\
				mediump float hCol = u_cols[0];								\
				mediump float vCol = u_cols[1];								\
				mediump float maxhBinCnt = hCol == 0.0? u_binCnts[0] : hCol == 1.0? u_binCnts[1] : u_binCnts[2];					\
				mediump float maxvBinCnt = vCol == 0.0? u_binCnts[0] : vCol == 1.0? u_binCnts[1] : u_binCnts[2];					\
				if (x < u_xLoc || x > u_xLoc + maxhBinCnt || y > u_yLoc + maxvBinCnt || y < u_yLoc){										\
					discard;												\
				}																\
				mediump float rawC = 0.0;								\
				if (hCol == vCol){										\
					for (mediump float i = 0.0; i < 7.0; i++){					\
						if (i >= u_numTiles)	break;							\
						rawC += calculateSumHist(x - u_xLoc, hCol, i);						\
					}	\
				}														\
				else {													\
					for (mediump float i = 0.0; i < 7.0; i++){					\
						if (i >= u_numTiles)	break;							\
						rawC += calculateSumHeatmap(x - u_xLoc, y - u_yLoc, hCol, vCol, i);	\
					}	\
				}														\
				\
				if (rawC == 0.0) discard;							\
				rawC = rawC * 255.0/u_factor;				\
				mediump float p1 = mod(rawC, 256.0);		\
				mediump float p2 = floor(mod(rawC, 65536.0)/256.0);		\
				mediump float p3 = floor(mod(rawC, 16777216.0)/65536.0);		\
				mediump float p4 = floor(rawC/16777216.0);		\
				gl_FragColor = vec4(p1/255.0, p2/255.0, p3/255.0, p4/255.0);		\
			}													\
			";
			var shader = gl.createShader(gl.FRAGMENT_SHADER);
			gl.shaderSource(shader, str);
			gl.compileShader(shader);
			if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) == 0)
			  alert(gl.getShaderInfoLog(shader));
			return shader;
	},
	//(v.g - 128.0/255.0) * 256.0 +  v.r : (v.a - 128.0/255.0) * 256.0 + v.b 
	//v.g * 256.0 +  v.r : v.a * 256.0 + v.b
	
	//when write results to FBO, use all 4 channels in the order of a b g r
	//u_maxCnt is useless for now
	getQueryShader3D_1Byte : function(gl) {
		var str =  "precision mediump float;							\
					uniform mediump float u_numTiles;							\
					uniform mediump sampler2D u_data0, u_data1, u_data2, u_data3;					\
					uniform mediump vec2 u_cols;						\
					uniform mediump float u_texw0, u_texw1, u_texw2, u_texw3;						\
					uniform vec4 u_binCnts, u_offsets;							\
					uniform mediump float u_xLoc, u_yLoc;									\
					uniform mediump float u_factor;										\
					uniform mediump vec4 u_lo0, u_lo1, u_lo2, u_lo3, u_hi0, u_hi1, u_hi2, u_hi3;										\
					uniform mediump float u_maxCnt;											\
					\
					float calculateSumHist(float binIdx, float col, float tileIdx) {								\
						mediump float  sum = 0.0;										\
						mediump vec4 u_low = tileIdx == 0.0 ? u_lo0 : tileIdx == 1.0 ? u_lo1 : tileIdx == 2.0 ? u_lo2 : u_lo3; 	\
						mediump vec4 u_hi = tileIdx == 0.0 ? u_hi0 : tileIdx == 1.0 ? u_hi1 : tileIdx == 2.0 ? u_hi2 : u_hi3; 	\
						mediump float lo = col == 0.0 ? u_low[0] : col == 1.0 ? u_low[1]  :  u_low[2] ;		\
						mediump float hi = col == 0.0 ? u_hi[0] : col == 1.0 ? u_hi[1]  :  u_hi[2] ;		\
						if (binIdx < lo || binIdx > hi) {        															\
							return sum;																						\
						}																									\
						mediump float alpha = -1.0, beta = -1.0;								\
						mediump vec3 cols = vec3(0.0, 1.0, 2.0);						\
						for (mediump float i = 0.0; i < 3.0; i++) {							\
							if (i == col)	continue;						\
							else if (alpha == -1.0)	alpha = i;							\
							else beta = i;							\
						}																\
						mediump float offset = col == 0.0 ? u_offsets[0] : col == 1.0 ? u_offsets[1] : u_offsets[2] ;		\
						mediump float binCnt = col == 0.0 ? u_binCnts[0] : col == 1.0 ? u_binCnts[1] : u_binCnts[2] ;		\
						mediump float alphaOffset = alpha == 0.0 ? u_offsets[0] : alpha == 1.0 ? u_offsets[1] : u_offsets[2] ;    \
						mediump float betaOffset = beta == 0.0 ? u_offsets[0] : beta == 1.0 ? u_offsets[1] : u_offsets[2] ;		\
						mediump float alphaLo = alpha == 0.0 ? u_low[0] : alpha == 1.0 ? u_low[1] : u_low[2] ;		\
						mediump float alphaHi = alpha == 0.0 ? u_hi[0] : alpha == 1.0 ? u_hi[1] : u_hi[2] ;		\
						mediump float betaLo = beta == 0.0 ? u_low[0] : beta == 1.0 ? u_low[1] : u_low[2] ;		\
						mediump float betaHi = beta == 0.0 ? u_hi[0] : beta == 1.0 ? u_hi[1] : u_hi[2] ;		\
						\
						mediump float texIdx, iu, iv, fz, mz;								\
						mediump float ir, jr;								\
						mediump vec4 v;	\
						mediump float start = binIdx * offset;				\
						mediump float u_texw = tileIdx == 0.0 ? u_texw0 : tileIdx == 1.0 ? u_texw1 : tileIdx == 2.0 ? u_texw2 : u_texw3; 	\
						for (mediump float i = 0.0; i < 1000000.0; i++) {							\
							ir = i + alphaLo;													\
							if (ir > alphaHi) break;											\
							for (mediump float j = 0.0; j < 1000000.0; j++) {						\
								jr = j + betaLo;												\
								if (jr > betaHi)		break;									\
								texIdx = start + ir*alphaOffset + jr*betaOffset ; \
								fz = floor(texIdx/4.0);						\
								mz = mod(texIdx, 4.0);						\
								iu = mod(fz, u_texw)/u_texw;							\
								iv = floor(fz/u_texw)/u_texw;							\
								v = tileIdx == 0.0 ? texture2D(u_data0, vec2(iu, iv)) : tileIdx == 1.0 ? texture2D(u_data1, vec2(iu, iv)) : tileIdx == 2.0 ? texture2D(u_data2, vec2(iu, iv)) : texture2D(u_data3, vec2(iu, iv)); 	\
								sum += mz==0.0 ? v.r : mz==1.0 ? v.g : mz==2.0 ? v.b : v.a;							\
							}																	\
						}																	\
						return sum;													\
					}																\
					\
					float calculateSumHeatmap(float xBinIdx, float yBinIdx, float hCol, float vCol, float tileIdx) {							\
						mediump float  sum = 0.0;							\
						mediump vec4 u_lo = tileIdx == 0.0 ? u_lo0 : tileIdx == 1.0 ? u_lo1 : tileIdx == 2.0 ? u_lo2 : u_lo3; 	\
						mediump vec4 u_hi = tileIdx == 0.0 ? u_hi0 : tileIdx == 1.0 ? u_hi1 : tileIdx == 2.0 ? u_hi2 : u_hi3; 	\
						mediump float xLo = hCol == 0.0 ? u_lo[0] : hCol == 1.0 ? u_lo[1] : u_lo[2];		\
						mediump float xHi = hCol == 0.0 ? u_hi[0] : hCol == 1.0 ? u_hi[1] : u_hi[2];		\
						mediump float yLo = vCol == 0.0 ? u_lo[0] : vCol == 1.0 ? u_lo[1] : u_lo[2];		\
						mediump float yHi = vCol == 0.0 ? u_hi[0] : vCol == 1.0 ? u_hi[1] : u_hi[2];		\
						if (xBinIdx < xLo || xBinIdx >= xHi || yBinIdx < yLo || yBinIdx >= yHi){        															\
							return sum;																						\
						}																	\
						mediump float xOffset = hCol == 0.0 ? u_offsets[0] : hCol == 1.0 ? u_offsets[1] : u_offsets[2];		\
						mediump float yOffset = vCol == 0.0 ? u_offsets[0] : vCol == 1.0 ? u_offsets[1] : u_offsets[2];		\
						mediump float xBinCnt = hCol == 0.0 ? u_binCnts[0] : hCol == 1.0 ? u_binCnts[1] : u_binCnts[2];		\
						mediump float yBinCnt = vCol == 0.0 ? u_binCnts[0] : vCol == 1.0 ? u_binCnts[1] : u_binCnts[2];		\
						mediump float alpha = -1.0;								\
						mediump vec3 cols = vec3(0.0, 1.0, 2.0);						\
						for (mediump float i = 0.0; i < 3.0; i++) {							\
							if (i == hCol || i == vCol)	continue;						\
							else alpha = i;							\
						}																\
						mediump float alphaOffset = alpha == 0.0 ? u_offsets[0] : alpha == 1.0 ? u_offsets[1] : u_offsets[2];    \
						mediump float alphaLo = alpha == 0.0 ? u_lo[0] : alpha == 1.0 ? u_lo[1] : u_lo[2];		\
						mediump float alphaHi = alpha == 0.0 ? u_hi[0] : alpha == 1.0 ? u_hi[1] : u_hi[2];		\
						mediump float texIdx, iu, iv, fz, mz;								\
						mediump float ir;											\
						mediump vec4 v;	\
						mediump float u_texw = tileIdx == 0.0 ? u_texw0 : tileIdx == 1.0 ? u_texw1 : tileIdx == 2.0 ? u_texw2 : u_texw3; 	\
						mediump float start = xBinIdx * xOffset + yBinIdx * yOffset;				\
						for (mediump float i = 0.0; i < 1000000.0; i++) {							\
							ir = i + alphaLo;													\
							if (ir > alphaHi) break;											\
							texIdx = start + ir*alphaOffset; 				\
							fz = floor(texIdx/4.0);						\
							mz = mod(texIdx, 4.0);						\
							iu = mod(fz, u_texw)/u_texw;							\
							iv = floor(fz/u_texw)/u_texw;							\
							v = tileIdx == 0.0 ? texture2D(u_data0, vec2(iu, iv)) : tileIdx == 1.0 ? texture2D(u_data1, vec2(iu, iv)) : tileIdx == 2.0 ? texture2D(u_data2, vec2(iu, iv)) : texture2D(u_data3, vec2(iu, iv)); 	\
							sum += mz==0.0 ? v.r : mz==1.0 ? v.g : mz==2.0 ? v.b : v.a;					\
						}																		\
						return sum;																\
					}													\
					\
					void main() {									\
						mediump float x = gl_FragCoord.x - 0.5;							\
						mediump float y = gl_FragCoord.y - 0.5;							\
						mediump float hCol = u_cols[0] <= u_cols[1] ? u_cols[0]: u_cols[1];								\
						mediump float vCol = u_cols[0] <= u_cols[1] ? u_cols[1]: u_cols[0];								\
						mediump float maxhBinCnt = hCol == 0.0? u_binCnts[0] : hCol == 1.0? u_binCnts[1] : u_binCnts[2] ;					\
						mediump float maxvBinCnt = vCol == 0.0? u_binCnts[0] : vCol == 1.0? u_binCnts[1] : u_binCnts[2] ;					\
						if ( x < u_xLoc || x > u_xLoc + maxhBinCnt || y > u_yLoc + maxvBinCnt || y < u_yLoc) {										\
							discard;												\
						}																\
						mediump float rawC = 0.0;								\
						if (hCol == vCol) {										\
							for (mediump float i = 0.0; i < 5.0; i++) {					\
								if (i >= u_numTiles)	break;							\
								rawC += calculateSumHist(x - u_xLoc, hCol, i);						\
							}	\
						}														\
						else {													\
							for (mediump float i = 0.0; i < 100.0; i++) {					\
								if (i >= u_numTiles)	break;							\
								rawC += calculateSumHeatmap(x - u_xLoc, y - u_yLoc, hCol, vCol, i);	\
							}	\
						}														\
						\
						if (rawC == 0.0) discard;							\
						rawC = rawC * 255.0 / u_factor;				\
						mediump float p1 = mod(rawC, 256.0);		\
						mediump float p2 = floor(mod(rawC, 65536.0)/256.0);		\
						mediump float p3 = floor(mod(rawC, 16777216.0)/65536.0);		\
						mediump float p4 = floor(rawC/16777216.0);		\
						gl_FragColor = vec4(p1/255.0, p2/255.0, p3/255.0, p4/255.0);		\
					}													\
					";
		var shader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(shader, str);
		gl.compileShader(shader);
		if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) == 0)
		  alert(gl.getShaderInfoLog(shader));
		return shader;
	},
	
	getVertexShader : function(gl) {
		var str =  "precision mediump float;		\
				precision mediump sampler2D;			\
				precision mediump int;			\
				attribute mediump vec2 a_position; 				\
			void main() {									\
			  gl_Position = vec4(a_position, 0.0, 1.0);			\
			}";

		var shader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(shader, str);
		gl.compileShader(shader);
		if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) == 0)
		  alert(gl.getShaderInfoLog(shader));
		
		return shader;
	}
	
});