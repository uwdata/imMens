package servlet;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

public class TileUtil {

	/**
	 * @param args
	 */
	public static String getTileId (String tilePath){
		String [] temp = tilePath.split("\\"+File.separator);
		return temp[temp.length-1].replace(".png", "");
	}
	
	public static JSONObject parseTileId(String id){
		JSONObject obj = new JSONObject();
		String [] temp = id.split("x");
		int [] dims = new int [temp.length];
		int [] starts = new int [temp.length];
		int [] ends = new int [temp.length];
		int [] zms = new int [temp.length];
		
		int count = 0;
		for(String s : temp){
			try {
				String [] info = s.split("-");
				dims[count] = Integer.parseInt(info[0]);
				starts[count] = Integer.parseInt(info[1]);
				ends[count] = Integer.parseInt(info[2]);
				zms[count] = Integer.parseInt(info[3]);
				count++;
			} catch (NumberFormatException e) {
				return null;
			}
		}
		
		obj.put("dims", dims);
		obj.put("startBins", starts);
		obj.put("endBins", ends);
		obj.put("zmLevels", zms);
		return obj;
	}
	
	//returns tile Id with .png
	public static void generateZoomingAdjacentTiles (JSONObject tileInfo, int dimIdx, String soFar, List<String> result, JSONObject meta){
		if (dimIdx == ((int [])tileInfo.get("dims")).length - 1){
			int dim = ((int [])tileInfo.get("dims"))[dimIdx];
			int startBin = ((int [])tileInfo.get("startBins"))[dimIdx]*2;
			int binCntPerTile = (Integer) ((JSONObject) meta.get(dim)).get("binsPerTile");
			while(startBin < ((int [])tileInfo.get("endBins"))[dimIdx]*2) {
				result.add(soFar + "x" + dim + "-" 
						+ startBin + "-" 
						+ (startBin + binCntPerTile - 1) + "-" 
						+ (((int [])tileInfo.get("zmLevels"))[dimIdx]+1) );
				startBin += binCntPerTile;
			}
			
			startBin = ((int [])tileInfo.get("startBins"))[dimIdx];
			result.add(soFar + "x" + dim + "-" 
					+ startBin + "-" 
					+ ((int [])tileInfo.get("endBins"))[dimIdx] + "-" 
					+ (((int [])tileInfo.get("zmLevels"))[dimIdx]) );
			
			startBin = ((int [])tileInfo.get("startBins"))[dimIdx]/2;
			result.add(soFar + "x" + dim + "-" 
					+ startBin + "-" 
					+ (startBin + binCntPerTile - 1) + "-" 
					+ (((int [])tileInfo.get("zmLevels"))[dimIdx]-1) );
			return;
		}
		else {
			String starter = dimIdx == 0 ? soFar : soFar + "x";
			int dim = ((int [])tileInfo.get("dims"))[dimIdx];
			int binCntPerTile = (Integer) ((JSONObject) meta.get(dim)).get("binsPerTile");
			
			int startBin = ((int [])tileInfo.get("startBins"))[dimIdx]*2;
			while(startBin < ((int [])tileInfo.get("endBins"))[dimIdx]*2) {
				String nextLevel = starter + dim + "-" 
						+ startBin + "-" 
						+ (startBin + binCntPerTile - 1) + "-" 
						+ (((int [])tileInfo.get("zmLevels"))[dimIdx]+1);
				startBin += binCntPerTile;
				generateZoomingAdjacentTiles (tileInfo, dimIdx + 1, nextLevel, result, meta);
			}
			
			startBin = ((int [])tileInfo.get("startBins"))[dimIdx];
			String currentLevel = starter + dim + "-" 
					+ startBin + "-" 
					+ ((int [])tileInfo.get("endBins"))[dimIdx] + "-" 
					+ (((int [])tileInfo.get("zmLevels"))[dimIdx]);
			generateZoomingAdjacentTiles (tileInfo, dimIdx + 1, currentLevel, result, meta);
			
			startBin = ((int [])tileInfo.get("startBins"))[dimIdx]/2;
			String previousLevel = starter + dim + "-" 
					+ startBin + "-" 
					+ (startBin + binCntPerTile - 1) + "-" 
					+ (((int [])tileInfo.get("zmLevels"))[dimIdx]-1);
			generateZoomingAdjacentTiles (tileInfo, dimIdx + 1, previousLevel, result, meta);
			
		}
	}
	
	
	public static void main(String[] args) {
		
		JSONObject meta = new JSONObject();
		String [] months = new String [] {"Jan", "Feb", "Mar", "Apr", "May","Jun",
				"Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
		String [] days =  new String [] {"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", 
					"14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31"};
		String [] hours = new String []{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", 
					"14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"};
		String [] dimNms =  new String [] {"Lat", "Lon", "Month", "Day", "Hour"};
		
		
		for (int col = 0; col < 5; col++){
			JSONObject o = new JSONObject();
    		o.put("dim", col);
    		o.put("dimNm", dimNms[col]);
    		o.put("dType", col <= 1 ? col : 3 );
    		o.put("binsPerTile", col <= 1 ? 256 : col == 2 ? 12 : col == 3 ? 31 : 24  );
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
    		
    		meta.put(col, o);
		}
		
		List<String> test = new ArrayList<String>();
		generateZoomingAdjacentTiles (parseTileId("0-0-255-9x1-256-511-9x3-0-31-0"), 0, "", test, meta);
//		for (String s : test)
//			System.out.println(s);
		
	}

}
