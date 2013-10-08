package servlet;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Hashtable;
import java.util.List;
import java.util.Map;
import java.util.Vector;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;


public class DataSetManager {

	private String datasetDir, dataset, tileBaseLocalURL;
	private JSONObject meta;

	//key examples: 0-27648-27903-8x1-32000-32255-8, 0-27648-27903-8x1-32000-32255-8x4-0-23-0	 
	//value example: 0-8x1-8x4-0/0-27648-27903-8x1-32000-32255-8x4-0-23-0.png
	private Map<String, List<String>> vTileId2dTileURL = new Hashtable<String, List<String>>();
	private Map<String, JSONObject> tileMetaLookup = new Hashtable<String, JSONObject>();
	private static final String tileBaseURL = "/imMens/ImmensServlet?pngTile=";
	private final static int maxCachedTiles = 500;

	private static final String fileSeparator = "^";
	private Map<String, byte []> dTileCache = new Hashtable<String, byte[]>();
	private List<String> cachedDTile = new Vector<String>();
	
    private List<String> loading = new ArrayList<String>();  
    
    JSONParser parser = new JSONParser();

	public DataSetManager(String dataset, String tileBaseLocalURL, String tileDir){
		this.datasetDir = tileDir;
		this.dataset = dataset;
		this.tileBaseLocalURL = tileBaseLocalURL;
	}

	public void init(){
		this.createMeta();
		try {
			this.indexTiles();
		} catch (FileNotFoundException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		} catch (ParseException e) {
			e.printStackTrace();
		}
	}

	private void indexTiles() throws FileNotFoundException, IOException, ParseException {
		File f = new File(tileBaseLocalURL + File.separator + datasetDir);

    	String tileId;
    	String [] tileInfo;
    	int [] zmInfo;
    	int zmSum;
    	for (File colZmCombin : f.listFiles()) {
    		if (!colZmCombin.isDirectory())	continue;
    		JSONObject jobj = (JSONObject) parser.parse(new FileReader(new File(colZmCombin.getAbsolutePath() + File.separator + "meta.json" )));
    		JSONObject globalMaxProj = (JSONObject) jobj.get("globalMaxProj");
			JSONObject globalMinProj = (JSONObject) jobj.get("globalMinProj");
			JSONObject tileMeta;
			for (Object key : jobj.keySet()) {
				if (key.toString().equals("globalMaxProj") || key.toString().equals("globalMinProj"))	continue;
				tileMeta = (JSONObject) jobj.get(key);
				if (globalMaxProj!=null)
					tileMeta.put("globalMaxProj", globalMaxProj);
				if (globalMinProj!=null)
					tileMeta.put("globalMinProj", globalMinProj);
				tileMetaLookup.put(key.toString(), tileMeta);
				
				tileInfo = key.toString().split("x");
				zmInfo = new int [tileInfo.length];
    			zmSum = 0;
    			for (int c = 0; c < zmInfo.length; c++) {
    				zmInfo[c] = Integer.parseInt(tileInfo[c].split("-")[3]);
    				zmSum += zmInfo[c];
    			}
    			for (int s = 0; s < tileInfo.length; s++) {
    				for (int n = 1; n <= tileInfo.length - s; n++) {
        				indexTile(tileInfo, zmInfo, s, n, 0, zmSum, "", colZmCombin.getName() + File.separator + key.toString() + ".png");
        			}
    			}
				
			}
    	}
	}
	
	private void indexTile(String [] tileInfo, int [] zmInfo, int start, int num, int zmSumSoFar, int zmSum, String keySoFar, String url) {
		if (num == 1) {
			String key = keySoFar + tileInfo[start];
			if (!vTileId2dTileURL.containsKey(key))
				vTileId2dTileURL.put(key, new ArrayList<String>());
			if (zmInfo[start] + zmSumSoFar == zmSum) {
				vTileId2dTileURL.get(key).add(0, url);
				//System.out.println(key + "\t\t" + url);
			}
		}  else if (start < tileInfo.length - 1) {
			for (int k = 1; start + k < tileInfo.length; k++) {
				indexTile(tileInfo, zmInfo, start + k, num - 1, zmInfo[start] + zmSumSoFar, zmSum, keySoFar + tileInfo[start] + "x" , url);
			}
		}
	}

	private void createMeta(){
    	JSONObject metaObj = new JSONObject();
		
    	if (dataset.equals("0")){
			//brightkite
			String [] months = new String [] {"Jan", "Feb", "Mar", "Apr", "May","Jun",
					"Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
			String [] days =  new String [] {"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", 
						"14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31"};
			String [] hours = new String []{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", 
						"14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"};
			String [] uids = new String[]{"u8483", "u69", "u102", "u2278", "u7125", "u560", "u9112", "u4", "u677", "u824",
				"u3642", "u8155", "u57190", "u14886", "u47889", "u13489", "u9568", "u431", "u4988", "u7757",
				"u10247", "u32712", "u14181", "u12201", "u26007", "u5751", "u30488", "u27787", "u37367", "u4760"};
			String [] dimNms =  new String [] {"Lat", "Lon", "Month", "Day", "Hour", "Top 30 Travelers"};
			
			
			for (int col = 0; col < 6; col++){
    			JSONObject o = new JSONObject();
        		o.put("dim", col);
        		o.put("dimNm", dimNms[col]);
        		o.put("dType", col <= 1 ? col : 3 );
        		o.put("binsPerTile", col <= 1 ? 256 : col == 2 ? 12 : col == 3 ? 31 : col == 4 ? 24 : 30  );
        		JSONObject totalBinCnt = new JSONObject();
        		JSONObject binWd = new JSONObject();
        		if (col == 2){ //month
        			JSONArray a = new JSONArray();
        			for (int c = 0; c < months.length; c++)
        				a.add(months[c]);
        			o.put("binNames", a);
        			binWd.put(0, 1);
        			totalBinCnt.put(0, 12);
        		}
        		else if (col == 3){//day
        			JSONArray a = new JSONArray();
        			for (int c = 0; c < days.length; c++)
        				a.add(days[c]);
        			o.put("binNames", a);
        			binWd.put(0, 1);
        			totalBinCnt.put(0, 31);
        		}
        		else if (col == 4){//hour
        			JSONArray a = new JSONArray();
        			for (int c = 0; c < hours.length; c++)
        				a.add(hours[c]);
        			o.put("binNames", a);
        			binWd.put(0, 1);
        			totalBinCnt.put(0, 24);
        		}
        		else if (col == 5){//uids
        			JSONArray a = new JSONArray();
        			for (int c = 0; c < uids.length; c++)
        				a.add(uids[c]);
        			o.put("binNames", a);
        			binWd.put(0, 1);
        			totalBinCnt.put(1, 30);
        		}
        		else {
        			o.put("binStartValue",  0 );
        			o.put("binWidth", 1);
        			totalBinCnt.put(1, 256);
        			totalBinCnt.put(2, 512);
        			totalBinCnt.put(3, 1024);
        			totalBinCnt.put(4, 2048);
        			totalBinCnt.put(5, 4096);
        			totalBinCnt.put(6, 8192);
        			totalBinCnt.put(7, 16384);
        			totalBinCnt.put(8, 32768);
        			totalBinCnt.put(9, 65536);
        		}
        		o.put("totalBinCnt", totalBinCnt);
        		o.put("binWidth", binWd);
        		metaObj.put(col, o);
        		
    		}
		}
		else if (dataset.equals("1")){
			//faa
			
			String [] carriers = new String []{"DL", "US", "AA", "WN", "UA", "NW", "CO", "HP", "TW", "MQ", "AS",
					"OO", "XE", "EV", "PI", "OH", "FL", "EA", "B6", "YV", "DH", "9E",
					"F9", "PA (1)", "TZ", "HA", "AQ", "PS", "ML (1)"
					};
			//int [] binCnts = new int [] {251, 251, 22, 12, carriers.length};
			int [] binCntsPerTile = new int [] {251, 253, 22, 12, carriers.length};

			//String [] dayOfWeek =  new String [] {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"};
			String [] years = new String []{"1987", "1988", "1989", "1990", "1991", "1992", "1993", "1994", "1995", "1996", "1997",
					"1998", "1999", "2000", "2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008"};
			String [] dimNms =  new String [] {"Departure Delay (minutes)", "Arrival Delay (minutes)", "Year", "Month", "Carriers"};
			String [] months = new String [] {"Jan", "Feb", "Mar", "Apr", "May","Jun",
					"Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
			
			for (int col = 0; col < 5; col++){
    			JSONObject o = new JSONObject();
        		o.put("dim", col);
        		o.put("dimNm", dimNms[col]);
        		o.put("dType", (col  >= 2) ? 3 : 2 );
        		o.put("binsPerTile", binCntsPerTile[col]  );
        		//o.put("totalBinCnt", binCnts[col]  );
        		JSONObject totalBinCnt = new JSONObject();
        		JSONObject binWd = new JSONObject();
        		if (col == 2){
        			JSONArray a = new JSONArray();
        			for (int c = 0; c < years.length; c++)
        				a.add(years[c]);
        			o.put("binNames", a);
        			totalBinCnt.put(0, 22);
        			binWd.put(0, 1);
        		} else if (col == 3){
        			JSONArray a = new JSONArray();
        			for (int c = 0; c < months.length; c++)
        				a.add(months[c]);
        			o.put("binNames", a);
        			totalBinCnt.put(0, 12);
        			binWd.put(0, 1);
        		} else if (col == 4){ //carriers
        			JSONArray a = new JSONArray();
        			for (int c = 0; c < carriers.length; c++)
        				a.add(carriers[c]);
        			o.put("binNames", a);
        			totalBinCnt.put(0, carriers.length);
        			binWd.put(0, 1);
        		} else {
        			totalBinCnt.put(0, binCntsPerTile[col]*1);
        			totalBinCnt.put(1, binCntsPerTile[col]*2);
        			totalBinCnt.put(2, binCntsPerTile[col]*4);
        			totalBinCnt.put(3, binCntsPerTile[col]*8);
        			totalBinCnt.put(4, binCntsPerTile[col]*16);
        			binWd.put(0, 16);
        			binWd.put(1, 8);
        			binWd.put(2, 4);
        			binWd.put(3, 2);
        			binWd.put(4, 1);
        			o.put("binStartValue", col == 0 ? -1410 : -1438);
        		}
        		o.put("totalBinCnt", totalBinCnt);
        		o.put("binWidth", binWd);
        		metaObj.put(col, o);
        		
    		}
		}
    	this.meta = metaObj;
    }

	public JSONObject getMeta() {
		return this.meta;
	}

	public JSONArray getTileInfo(String q) {
		String [] tiles = q.split("_");
    	
		JSONArray arr = new JSONArray();
		List<String> toLoad = new ArrayList<String>();
		for (String tile : tiles){
			
			if (!vTileId2dTileURL.containsKey(tile) || vTileId2dTileURL.get(tile).size() == 0)
				continue;
			
			String tilePath = vTileId2dTileURL.get(tile).get(0);
			String tileId = tilePath.substring(tilePath.lastIndexOf(File.separator)+1).replace(".png", "");
			JSONObject tileMeta = tileMetaLookup.get(tileId);
			if (tileMeta == null)
				System.out.println(tileId);
			
			JSONObject obj = new JSONObject();
			String tileURL =  datasetDir + File.separator + tilePath;
			tileURL = tileBaseURL + File.separator + tileURL.replace(File.separator, fileSeparator);
			//System.out.println(tilePath);
			toLoad.add(tile);
			//System.out.println(tileURL);
			obj.put("tileURL", tileURL + "&dataset=" + this.dataset);
			obj.put("forVTile", tile);
			obj.put("factor", tileMeta.get("factor"));
			if (tileMeta.containsKey("globalMaxProj"))
				obj.put("globalMaxProj", tileMeta.get("globalMaxProj"));
			if (tileMeta.containsKey("globalMinProj"))
				obj.put("globalMinProj", tileMeta.get("globalMinProj"));
			obj.put("tileId", tileId);

			arr.add(obj);
		}
		
		preloadPNGTiles(toLoad);
		PreLoadAdjacentPNGTiles bgTask = new PreLoadAdjacentPNGTiles(toLoad);
		(new Thread(bgTask)).start();
		return arr;
	}

	public byte [] getPNGTile(String pngTile) {
		byte [] buf = null;
		try {
			String tilePath = pngTile.replace(fileSeparator, File.separator);
			String [] temp = pngTile.split("\\"+fileSeparator); 
			String tileId = temp[temp.length - 1].replace(".png", "");
			//System.out.println(tileId);
			
			if (dTileCache.containsKey(tileId)) {
				buf = dTileCache.get(tileId);
			} else {
				System.out.println("missed: " + tileId);
				File f = new File(tileBaseLocalURL + File.separator + tilePath);
				//File f = new File(ctxt.getRealPath(tilePath));
				FileInputStream in = new FileInputStream(f);
				// Copy the contents of the file to the output stream
				buf = new byte[(int) f.length()];
				in.read(buf);
				in.close();
				dTileCache.put(tileId, buf);
			}
		} catch (IOException e) {
			e.printStackTrace();
		}
		return buf;
	}
	
	private void preloadPNGTiles(List<String> toLoad){
		byte [] buf;
		for (String tileId : toLoad){
			//System.out.println("trying to load " + tilePath);
			if (!vTileId2dTileURL.containsKey(tileId)) continue;
			String s = TileUtil.getTileId(vTileId2dTileURL.get(tileId).get(0));
			if (dTileCache.containsKey(s))	continue;
			if (loading.contains(s))	continue;
			
			//if (dTileCache.containsKey(tileId))	continue;
			
			loading.add(s);
			//System.out.println("loading " + tileId + "\t\t--> " + s);
			
			File f = new File(tileBaseLocalURL + File.separator + datasetDir + File.separator + vTileId2dTileURL.get(TileUtil.getTileId(tileId)).get(0));
			FileInputStream in;
			try {
				in = new FileInputStream(f);
				buf = new byte[(int) f.length()];
				in.read(buf);
				in.close();

				if (cachedDTile.size() > maxCachedTiles){
					String toRemove = cachedDTile.get(0);
					cachedDTile.remove(0);
					dTileCache.remove(toRemove);
					//System.out.println("popping" + toRemove);
				}
				
				dTileCache.put(f.getName().replace(".png", ""), buf);
				cachedDTile.add(f.getName().replace(".png", ""));
				loading.remove(tileId);
				
			} catch (FileNotFoundException e) {
				e.printStackTrace();
			} catch (IOException e) {
				e.printStackTrace();
			}
			
		}
	}
	
	class PreLoadAdjacentPNGTiles implements Runnable {

    	List<String> tilePaths;
    	PreLoadAdjacentPNGTiles(List<String> tPaths){
    		this.tilePaths = tPaths;
    	}
    	
    	
		@Override
		public void run() {
			String tileId;
			for (String tilePath : tilePaths){
				String [] temp = tilePath.split("\\"+File.separator); 
				tileId = temp[temp.length - 1].replace(".png", "");
				JSONObject obj = TileUtil.parseTileId(tileId);
				if (obj == null)	continue;
				//System.out.println("prefetching " + tilePath);
				//get previous and next zoom level
				List<String> adjacentZmTiles = new ArrayList<String>();
				TileUtil.generateZoomingAdjacentTiles(obj, 0, "", adjacentZmTiles, getMeta());
				//System.out.println(adjacentZmTiles);
				
				//private void preloadPNGTiles(List<String> toLoad){
				byte [] buf;
				for (String tId : adjacentZmTiles){
					//System.out.println("trying to load " + tilePath);
					if (!vTileId2dTileURL.containsKey(tId)) continue;
					String s = TileUtil.getTileId(vTileId2dTileURL.get(tId).get(0));
					if (dTileCache.containsKey(s))	continue;
					if (loading.contains(s))	continue;
					
					loading.add(s);
					//System.out.println("loading adjacent: " + tId + "\t\t--> " + s);
					
					File f = new File(tileBaseLocalURL + File.separator + datasetDir + File.separator + vTileId2dTileURL.get(TileUtil.getTileId(tId)).get(0));
					FileInputStream in;
					try {
						in = new FileInputStream(f);
						buf = new byte[(int) f.length()];
						in.read(buf);
						in.close();
						dTileCache.put(f.getName().replace(".png", ""), buf);
						loading.remove(tId);
					} catch (FileNotFoundException e) {
						e.printStackTrace();
					} catch (IOException e) {
						e.printStackTrace();
					}
					
				}
				//}
				//preloadPNGTiles(adjacentZmTiles);
			}
		}
    }

}
