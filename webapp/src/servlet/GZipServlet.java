package servlet;


import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.Hashtable;
import java.util.List;
import java.util.Map;
import java.util.Vector;
import java.util.zip.GZIPOutputStream;

import javax.imageio.ImageIO;
import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

/**
 * @deprecated
 * Servlet implementation class GZipServlet
 */
@WebServlet("/GZipServlet")
public class GZipServlet extends HttpServlet {
	private static final long serialVersionUID = 1L;
	
	JSONParser parser = new JSONParser();
	
	//key examples: 0-27648-27903-8x1-32000-32255-8, 0-27648-27903-8x1-32000-32255-8x4-0-23-0	 
	//value example: 0-8x1-8x4-0/0-27648-27903-8x1-32000-32255-8x4-0-23-0.png
	private Map<String, List<String>> vTileId2dTileURL = new Hashtable<String, List<String>>();
	private Map<String, JSONObject> tileMetaLookup = new Hashtable<String, JSONObject>();
	private static final String tileBaseURL = "/imMens/GZipServlet?pngTile=";
	private String tileBaseLocalURL; 
	private final String datasetDir = "brightkite";
	private final static int maxCachedTiles = 500;
	
	//"/Users/zcliu/Dropbox/github/imMens/WebContent";
	private static final String fileSeparator = "^";
	private Map<String, JSONObject> datasetMeta = new Hashtable<String, JSONObject>();
	private Map<String, byte []> dTileCache = new Hashtable<String, byte[]>();
	private List<String> cachedDTile = new Vector<String>();
	
    private List<String> loading = new ArrayList<String>();  
	
    /**
     * @see HttpServlet#HttpServlet()
     */
    public GZipServlet() {
        super();
    }

    public void init(ServletConfig config) throws ServletException {
    	super.init(config);
    	String os = System.getProperty("os.name").toLowerCase();
    	
    	if (os.indexOf("win") >= 0){
    		tileBaseLocalURL = "C:\\Program Files\\jetty\\webapps\\tiles-png\\";
    	} else if (os.indexOf("mac") >= 0){
    		tileBaseLocalURL = "/Users/zcliu/Dropbox/github/tiles/";
    	} else if (os.indexOf("nix") >= 0 || os.indexOf("nux") >= 0 || os.indexOf("aix") > 0){
    		tileBaseLocalURL = "/u/zcliu/Documents/tiles-png/";
    	}
    	
    	try {
    		createMeta("0");
			indexTiles();
		} catch (FileNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (ParseException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
    }
    
    //meta should be changed to JSONObject
    private void createMeta(String dataset){
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
        		if (col == 2){ //month
        			JSONArray a = new JSONArray();
        			for (int c = 0; c < months.length; c++)
        				a.add(months[c]);
        			o.put("binNames", a);
        			totalBinCnt.put(0, 12);
        		}
        		else if (col == 3){//day
        			JSONArray a = new JSONArray();
        			for (int c = 0; c < days.length; c++)
        				a.add(days[c]);
        			o.put("binNames", a);
        			totalBinCnt.put(0, 31);
        		}
        		else if (col == 4){//hour
        			JSONArray a = new JSONArray();
        			for (int c = 0; c < hours.length; c++)
        				a.add(hours[c]);
        			o.put("binNames", a);
        			totalBinCnt.put(0, 24);
        		}
        		else if (col == 5){//uids
        			JSONArray a = new JSONArray();
        			for (int c = 0; c < uids.length; c++)
        				a.add(uids[c]);
        			o.put("binNames", a);
        			totalBinCnt.put(1, 30);
        		}
        		else {
        			o.put("binStartValue",  0 );
        			o.put("binWidth", col <=1 ? 15 : 1);
        			totalBinCnt.put(1, 256);
        			totalBinCnt.put(2, 512);
        			totalBinCnt.put(3, 1024);
        			totalBinCnt.put(4, 2048);
        			totalBinCnt.put(5, 4096);
        			totalBinCnt.put(6, 8192);
        			totalBinCnt.put(7, 16384);
        			totalBinCnt.put(8, 32768);
        		}
        		o.put("totalBinCnt", totalBinCnt);
        		
        		metaObj.put(col, o);
        		
    		}
		}
		else if (dataset.equals("1")){
			//faa
			int [] binCnts = new int [] {174, 174, 28, 20, 12};
			int [] binCntsPerTile = new int [] {174, 174, 28, 20, 12};
			String [] carriers = {"DL", "WN", "US", "UA", "AA", "NW", "CO", 
					"MQ", "HP", "TW", "OO", "AS", "XE", "EV", "FL", "OH", "B6", 
					"YV", "DH", "PI", "9E", "F9", "EA", "TZ", "PA (1)", "HA", "AQ", "ML (1)"};
//					new String [] {"FL", "US", "OH", "DH", "AS","OO",
//					"B6", "9E", "PI", "CO", "PA (1)", "AQ", "HA",
//					"XE", "EA", "NW", "DL", "EV", "ML (1)", "MQ",
//					"TW", "YV", "TZ", "HP", "WN", "UA", "F9", "AA"};
			String [] dayOfWeek =  new String [] {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"};
			String [] years = new String []{"1989", "1990", "1991", "1992", "1993", "1994", "1995", "1996", "1997",
					"1998", "1999", "2000", "2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008"};
			String [] dimNms =  new String [] {"Departure Delay (minutes)", "Arrival Delay (minutes)", "Carriers", "Year", "Month"};
			String [] months = new String [] {"Jan", "Feb", "Mar", "Apr", "May","Jun",
					"Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
			
			for (int col = 0; col < 5; col++){
				//if (col == 4)	continue;
    			JSONObject o = new JSONObject();
        		o.put("dim", col);
        		o.put("dimNm", dimNms[col]);
        		o.put("dType", (col  >= 2) ? 3 : 2 );
        		o.put("binsPerTile", binCntsPerTile[col]  );
        		o.put("totalBinCnt", binCnts[col]  );
        		o.put("binStartValue",  0 );
        		if (col == 2){ //carriers
        			JSONArray a = new JSONArray();
        			for (int c = 0; c < carriers.length; c++)
        				a.add(carriers[c]);
        			o.put("binNames", a);
        		}
        		else if (col == 3){
        			JSONArray a = new JSONArray();
        			for (int c = 0; c < years.length; c++)
        				a.add(years[c]);
        			o.put("binNames", a);
        		}
        		else if (col == 4){
        			JSONArray a = new JSONArray();
        			for (int c = 0; c < months.length; c++)
        				a.add(months[c]);
        			o.put("binNames", a);
        		}
        		else {
        			o.put("binWidth", col <=1 ? 15 : 1);
        		}
        		metaObj.put(col, o);
        		
    		}
		}
    	datasetMeta.put(dataset, metaObj);
    }
    
    private void indexTiles() throws FileNotFoundException, IOException, ParseException {
    	File f = new File(tileBaseLocalURL + File.separator + datasetDir);

    	String tileId;
    	String [] tileInfo;
    	int [] zmInfo;
    	int zmSum;
    	for (File colZmCombin : f.listFiles()) {
    		if (!colZmCombin.isDirectory() || colZmCombin.getName().startsWith("0-9"))	continue;
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
//    				if (tileInfo[c].split("-").length < 4)
//    					System.out.println(tileId);
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
    
//    private void indexTiles_deprecated() throws FileNotFoundException, IOException, ParseException {
//    	File f = new File(tileBaseLocalURL + File.separator + "tiles-png"+ File.separator + "brightkite");
//
//    	String tileId;
//    	String [] tileInfo;
//    	int [] zmInfo;
//    	int zmSum;
//    	for (File colZmCombin : f.listFiles()) {
//    		if (!colZmCombin.isDirectory() || colZmCombin.getName().startsWith("0-9"))	continue;
//    		//System.out.println(colZmCombin.getName());
//    		for (File tile : colZmCombin.listFiles()) {
//    			
//    			if (tile.getName().endsWith(".json")) {
//    				//System.out.println(colZmCombin.getName());
//    				JSONObject jobj = (JSONObject) parser.parse(new FileReader(tile));
//    				JSONObject globalMaxProj = (JSONObject) jobj.get("globalMaxProj");
//    				JSONObject globalMinProj = (JSONObject) jobj.get("globalMinProj");
//    				JSONObject tileMeta;
//    				for (Object key : jobj.keySet()) {
//    					if (key.toString().equals("globalMaxProj") || key.toString().equals("globalMinProj"))	continue;
//    					tileMeta = (JSONObject) jobj.get(key);
//    					if (globalMaxProj!=null)
//    						tileMeta.put("globalMaxProj", globalMaxProj);
//    					if (globalMinProj!=null)
//    						tileMeta.put("globalMinProj", globalMinProj);
//    					tileMetaLookup.put(key.toString(), tileMeta);
//    					//System.out.println(key + "\t" + jobj.get(key));
//    				}
//    			}
//    			else if (tile.getName().endsWith(".png")){
//    				tileId = tile.getName().replace(".png", "");
//    				FileInputStream in = new FileInputStream(tile);
//    				// load the tile in memory
//    				byte[] buf = new byte[(int) tile.length()];
//    				in.read(buf);
//    				in.close();
//    				tileCache.put(tileId, buf);
//        			//System.out.println("***" + tileId);
//        			tileInfo = tileId.split("x");
//        			zmInfo = new int [tileInfo.length];
//        			zmSum = 0;
//        			for (int c = 0; c < zmInfo.length; c++) {
//        				if (tileInfo[c].split("-").length < 4)
//        					System.out.println(tileId);
//        				zmInfo[c] = Integer.parseInt(tileInfo[c].split("-")[3]);
//        				zmSum += zmInfo[c];
//        			}
//        			for (int s = 0; s < tileInfo.length; s++) {
//        				for (int n = 1; n <= tileInfo.length - s; n++) {
//            				indexTile(tileInfo, zmInfo, s, n, 0, zmSum, "", "tiles-png"+ File.separator + "brightkite" + File.separator + colZmCombin.getName() + File.separator + tile.getName());
//            			}
//        			}
//    			}
//    		}//each file
//    	}
//	}

	private void indexTile(String [] tileInfo, int [] zmInfo, int start, int num, int zmSumSoFar, int zmSum, String keySoFar, String url) {
		if (num == 1) {
			String key = keySoFar + tileInfo[start];
			if (!vTileId2dTileURL.containsKey(key))
				vTileId2dTileURL.put(key, new ArrayList<String>());
			if (zmInfo[start] + zmSumSoFar == zmSum) {
				vTileId2dTileURL.get(key).add(url);
				//System.out.println(key + "\t\t" + url);
			}
		}  else if (start < tileInfo.length - 1) {
			for (int k = 1; start + k < tileInfo.length; k++) {
				indexTile(tileInfo, zmInfo, start + k, num - 1, zmInfo[start] + zmSumSoFar, zmSum, keySoFar + tileInfo[start] + "x" , url);
			}
		}
	}
	
	public void doPost(HttpServletRequest req, HttpServletResponse res)throws ServletException, IOException 
	{       
		String subject = req.getParameter("subject");
		String time = req.getParameter("time");
		String action = req.getParameter("action");
		String spec = req.getParameter("spec");
		String value = req.getParameter("value");
		System.out.println(subject + "," + time + "," + action + "," + spec + "," + value);
	}

	public void doGet(HttpServletRequest req, HttpServletResponse res)
			throws ServletException, IOException {
    	String q = req.getParameter("q");
    	String meta = req.getParameter("meta");
    	String dataset = req.getParameter("dataset");
    	String pngTile = req.getParameter("pngTile");
		
    	if (q!=null){
        	doGetTileJSON(req, res, q, dataset);
    	} 
    	else if (pngTile != null) {
    		doGetPNGTile(req, res, pngTile, dataset);
    	}
    	else if (meta!=null){
    		doGetMeta(req, res, dataset);
    	}
    	
	}
    
	private void doGetPNGTile(HttpServletRequest req, HttpServletResponse res, String pngTile, String dataset) {
		try {
			String tilePath = pngTile.replace(fileSeparator, File.separator);
			String [] temp = pngTile.split("\\"+fileSeparator); 
			String tileId = temp[temp.length - 1].replace(".png", "");
			//System.out.println(tileId);
			
			byte [] buf;
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
			res.setContentType("image/png");
			
			OutputStream out = res.getOutputStream();
			res.setContentLength(buf.length);
			out.write(buf);
			out.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
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
	
	private void preloadAdjacentPNGTiles(List<String> tilePaths){
		//List<String> result = new ArrayList<String>();
		String tileId;
		for (String tilePath : tilePaths){
			String [] temp = tilePath.split("\\"+File.separator); 
			tileId = temp[temp.length - 1].replace(".png", "");
			JSONObject obj = TileUtil.parseTileId(tileId);
			if (obj == null)	continue;
			//System.out.println("prefetching " + tilePath);
			//get previous and next zoom level
			List<String> adjacentZmTiles = new ArrayList<String>();
			TileUtil.generateZoomingAdjacentTiles(obj, 0, "", adjacentZmTiles, datasetMeta.get("0"));
			//System.out.println(adjacentZmTiles);
			preloadPNGTiles(adjacentZmTiles);
		}
		//return result;
	}

	private void doGetTileJSON(HttpServletRequest req, HttpServletResponse res, String q, String dataset) {
		String [] tiles = q.split("_");
    	
		JSONArray arr = new JSONArray();
		List<String> toLoad = new ArrayList<String>();
		for (String tile : tiles){
			
			if (!vTileId2dTileURL.containsKey(tile))
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
			obj.put("tileURL", tileURL);
			obj.put("forVTile", tile);
			obj.put("factor", tileMeta.get("factor"));
			if (tileMeta.containsKey("globalMaxProj"))
				obj.put("globalMaxProj", tileMeta.get("globalMaxProj"));
			if (tileMeta.containsKey("globalMinProj"))
				obj.put("globalMinProj", tileMeta.get("globalMinProj"));
			obj.put("tileId", tileId);

			arr.add(obj);
		}
		
		//System.out.println(tileBaseLocalURL + File.separator + tilePath);
		
		try {
			res.setContentType("application/json");
			PrintWriter out = res.getWriter();
			out.print(arr);
			out.flush();
		}  catch (IOException e) {
			e.printStackTrace();
		}
		
		preloadPNGTiles(toLoad);
//		System.out.println("-----");
		PreLoadAdjacentPNGTiles bgTask = new PreLoadAdjacentPNGTiles(toLoad);
		(new Thread(bgTask)).start();
		
//		preloadAdjacentPNGTiles(toLoad);
//		System.out.println();
	}
	
	private void doGetMeta(HttpServletRequest req, HttpServletResponse res, String dataset) {
		try {
			zipAndSend(req, res, datasetMeta.get(dataset).toJSONString());
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
	
    private void zipAndSend(HttpServletRequest req, HttpServletResponse res, String data) throws IOException{
    	String encoding = req.getHeader("Accept-Encoding");
		boolean canGzip = false;

		if (encoding != null)
			if (encoding.indexOf("gzip") >= 0)
				canGzip = true;

		//canGzip = false;

		if (canGzip) {
			res.setHeader("Content-Encoding", "gzip");
			OutputStream o = res.getOutputStream();
			GZIPOutputStream gz = new GZIPOutputStream(o);

			gz.write(data.getBytes());
			gz.close();
			o.close();

		} else // no compression
		{
			PrintWriter out = res.getWriter();
			res.setContentType("text/html");

			out.println("<html>");
			out.println("<br>no compression here");
			out.println("</html>");

			out.flush();
			out.close();
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
				TileUtil.generateZoomingAdjacentTiles(obj, 0, "", adjacentZmTiles, datasetMeta.get("0"));
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

