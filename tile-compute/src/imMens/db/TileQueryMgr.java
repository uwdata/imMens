package imMens.db;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.UnsupportedEncodingException;
import java.io.Writer;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.Hashtable;
import java.util.List;
import java.util.Map;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;

public class TileQueryMgr {

	/**
	 * @param args
	 */
	public static final int numeric = 0;
	public static final int ordinal = 1;
	public static final int categorical = 2;
	
	private String delim = "_";
	
	private Connection con = null;
	private Statement stmt = null;
	private ResultSet rs = null;
	
	private String [] cols;
	private int [] colTypes; 
	private double [] binSize;
	private double [] min, max;
	private int [] binCntsPerTile;
	private int [] rangePerDim;
	private int [] zmLevels;
	private List<String []> vals;
	
	private static int maxBinCntPerDim = 256;
	//private List<String> tilesGenerated = new ArrayList<String>();
	
	public TileQueryMgr(String url, String usr, String pwd) {
		try {
			Class.forName("org.postgresql.Driver");
			con = DriverManager.getConnection(url, usr, pwd);
	        stmt = con.createStatement();
		} catch (ClassNotFoundException e) {
			e.printStackTrace();
		} catch (SQLException e) {
			e.printStackTrace();
		}
	}
	
	public void setColInfo (String [] cols, int [] colTypes, double [] binSize, double[] min, double [] max, List<String []> vals, int [] zmLevels) {
		this.cols = cols;
		this.colTypes = colTypes;
		this.binSize = binSize;
		this.min = min;
		this.max = max;
		this.vals = vals;
		this.zmLevels = zmLevels;
		this.binCntsPerTile = new int [cols.length];
		this.rangePerDim = new int [cols.length];
		//for (int zm = 0; zm < binSize.length; zm++) {
			for (int i = 0; i < cols.length; i++) {
				binCntsPerTile[i] = getNumBins(i)[1];
				rangePerDim[i] = getNumBins(i)[0];
			}
		//}
		
		System.out.println("bins per tile " + Arrays.toString(binCntsPerTile));
		System.out.println("range per dim " + Arrays.toString(rangePerDim));
	}
	
	private String createBinnedDimClause (int i) {
		switch (colTypes[i]) {
		case numeric:
			return "trunc(\"" + cols[i] + "\"/" + binSize[i] + "), ";
		default: //ordinal and categorical
			return "\""+ cols[i] + "\", ";
		}
	}
	
//	private int getDP (int col){
//		double lo = min[col];
//		double hi = min[col] + binSize[col] * binCntsPerTile[col];
//		
//		return binCntsPerTile[col]
//	}
	
	private String createWhereClause (int [] tileCols, int [] tileNum) {
		
		String temp, clause = "";
		for (int i = 0; i < tileCols.length; i++) {
			switch (colTypes[tileCols[i]]) {
			case numeric:
				double lo = min[tileCols[i]] + binSize[tileCols[i]] * binCntsPerTile[tileCols[i]] * tileNum[i];
				double hi = min[tileCols[i]] + binSize[tileCols[i]] * binCntsPerTile[tileCols[i]] * (tileNum[i] + 1);
				temp = " \"" + cols[tileCols[i]] + "\" >= " + lo + " AND \"" + cols[tileCols[i]] + "\" < " + hi;
				if (!clause.trim().equals(""))
					clause += " AND ";
				clause += temp;
				break;
			default: //ordinal and categorical
				if (tileCols[i] == 5){
					String s = "(";
					for (String str : vals.get(tileCols[i]))
						s += "'" + str + "',";
					s = s.substring(0, s.length() - 1);
					s += ")";
					temp = " \"" + cols[tileCols[i]] + "\" IN " + s ;
				}
				else
					temp = "";
				if (!clause.trim().equals("") && temp != "")
					clause += " AND ";
				clause += temp;
			}	
		}
		
		return clause.trim().equals("") ? "" : " where " + clause;
	}
	
	private String getTileIdx (int [] tileCols, int [] tileNum) {
		
		String temp, clause = "";
		int lo, hi;
		for (int i = 0; i < tileCols.length; i++) {
			switch (colTypes[tileCols[i]]) {
			case numeric:
				lo = (int) (binCntsPerTile[tileCols[i]] * tileNum[i]);
				hi = (int) (binCntsPerTile[tileCols[i]] * (tileNum[i] + 1));
				temp =  tileCols[i] + "-" + lo + "-"  + (hi-1) + "-" + zmLevels[tileCols[i]];
				if (!clause.trim().equals(""))
					clause += "x";
				clause += temp;
				break;
			default: //ordinal and categorical
				lo = (int) (binCntsPerTile[tileCols[i]] * tileNum[i]);
				hi = (int) (binCntsPerTile[tileCols[i]] * (tileNum[i] + 1));
				temp =  tileCols[i] + "-" + lo + "-"  + (hi-1) + "-" + zmLevels[tileCols[i]];
				if (!clause.trim().equals(""))
					clause += "x";
				clause += temp;
			}	
		}
		
		return clause;
		
	}
	
	private List<int []> getTileParams (int [] tileCols, int [] tileNum) {
		
		List<int []> result = new ArrayList<int []>();
		int lo, hi, z;
		for (int i = 0; i < tileCols.length; i++) {
			switch (colTypes[tileCols[i]]) {
			case numeric:
				lo = (int) (binCntsPerTile[tileCols[i]] * tileNum[i]);
				hi = (int) (binCntsPerTile[tileCols[i]] * (tileNum[i] + 1));
				z = zmLevels[tileCols[i]];
				result.add(new int[]{tileCols[i], lo,hi-1,z});
				break;
			default: //ordinal and categorical
				lo = (int) (binCntsPerTile[tileCols[i]] * tileNum[i]);
				hi = (int) (binCntsPerTile[tileCols[i]] * (tileNum[i] + 1));
				z = zmLevels[tileCols[i]];
				result.add(new int[]{tileCols[i],lo,hi-1,z});
				break;
			}	
		}
		
		return result;
	}
	
	private  int []  getNumBins (int i) {
		switch (colTypes[i]) {
		case numeric:
			return estimateBinsPerTile( (int)Math.floor((max[i] - min[i])/binSize[i]) + 1 );
		default: //ordinal and categorical
			return new int [] {1, vals.get(i).length};
		}
	}
	
	private int[] estimateBinsPerTile (int totalBinCnt) {
		
		//return new int [] {(int)Math.ceil(totalBinCnt*1.0/256), 256};
		
		for (int i = 1; i < 100; i++) {
			if (totalBinCnt*1.0/i < TileQueryMgr.maxBinCntPerDim)
				return new int [] {i, (int)Math.ceil(totalBinCnt*1.0/i)};
		}
		return new int [] {-1, -1};
	}
	
	private String getBinRep (int col, int binIdx) {
		switch (colTypes[col]) {
		case numeric:
			return Integer.toString((int) Math.floor(min[col]/binSize[col]) + binIdx);
		default: //ordinal and categorical
			return vals.get(col)[binIdx];
		}
	}
	
	//zm level is a global thing? or a vis dependent thing?
	public void computeTile (int [] tileCols, String tableName, String csvDir) {
		File meta = new File(csvDir + File.separator + "tilesComputed");
		if (meta.exists())	return;
		
		//index database to queries faster
		String indexName = "i", indexCols = "";
		for (int i = 0; i < tileCols.length; i++){
			indexName += this.cols[tileCols[i]] + "_";
			indexCols += this.cols[tileCols[i]] +",";
		}
		String indexDB = "CREATE INDEX " + indexName + " ON " + tableName + " (" + indexCols.substring(0, indexCols.length()-1) + ")";
		
//		try {
//			//System.out.println(indexDB);
//			stmt.executeUpdate(indexDB);
//		} catch (SQLException e) {
//			e.printStackTrace();
//		}
		
		int globalMax = 0;
		//tilesGenerated.clear();
		
		//double [] tt = new double [121];
		
		System.out.println("start querying on " + indexCols);
		if (tileCols.length == 3) {
			for (int a = 0; a < rangePerDim[tileCols[0]]; a++) {
				for (int b = 0; b < rangePerDim[tileCols[1]]; b++) {
					for (int c = 0; c < rangePerDim[tileCols[2]]; c++) {
						
						String f  = this.getTileIdx(tileCols, new int []{a,b,c});
						f = csvDir + f +".gz";
						File temp = new File(f);
						if (temp.exists())	continue;
						
						
						Date d1= new Date();
						
						String query = "SELECT ";
						for (int i = 0; i < tileCols.length; i++) {
							query += createBinnedDimClause(tileCols[i]);
						}
						query += "count(*) from " + tableName;
						
						query += createWhereClause(tileCols, new int [] {a, b, c}) + " group by 1, 2, 3";
						//System.out.println(getTileIdx(tileCols, zmlevel, new int []{a,b,c}));
						System.out.println(query);
						int max = executeQuery(query, tileCols, csvDir, new int []{a,b,c});
						
//						System.out.println(max);
						if (max > globalMax)	globalMax = max;
						
						Date d2 = new Date();
						
//						tt[count] = d2.getTime() - d1.getTime();
//						count++;
					}
				}
			}
			//System.out.println(Arrays.toString(tileCols) + " " + average(tt));
		}
		else if (tileCols.length == 4) {
			for (int a = 0; a < rangePerDim[tileCols[0]]; a++) {
				for (int b = 0; b < rangePerDim[tileCols[1]]; b++) {
					for (int c = 0; c < rangePerDim[tileCols[2]]; c++) {
						for (int d = 0; d < rangePerDim[tileCols[3]]; d++) {
							String query = "SELECT ";
							for (int i = 0; i < tileCols.length; i++) {
								query += createBinnedDimClause(tileCols[i]);
							}
							query += "count(*) from " + tableName;
							
							query += createWhereClause(tileCols, new int [] {a, b, c, d}) + " group by 1, 2, 3, 4";
							//System.out.println(getTileIdx(tileCols, zmlevel, new int []{a,b,c}));
							System.out.println(query);
							int max = executeQuery(query, tileCols, csvDir, new int []{a,b,c, d});
							if (max > globalMax)	globalMax = max;
						}
					}
				}
			}
			//System.out.println(Arrays.toString(tileCols) + " " + average(tt));
		}
		
//		String deleteIndex = "drop index " + indexName;
//		try {
//			stmt.executeUpdate(deleteIndex);
//		} catch (SQLException e) {
//			e.printStackTrace();
//		}
		
		
		try {
			File file = new File(csvDir + File.separator +"tilesComputed");
			// creates the file
			file.createNewFile();
			// creates a FileWriter Object
			FileWriter writer = new FileWriter(file); 
			// Writes the content to the file
			writer.write(""+globalMax); 
			writer.flush();
			writer.close();
		} catch (UnsupportedEncodingException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
	
	private String average (double [] arr){
		double sum = 0.0, max = 0.0, min = 1000;
		for (double d : arr){
			sum += d;
			if (d > max)	max = d;
			if (d < min)	min = d;
		}
		return " avg " + sum/arr.length + " max " + max +  " min " + min;
	}
	
	private int executeQuery(String query, int [] tileCols, String csvDir, int [] tileNums) {
		Map<String, Integer> hash = new Hashtable<String, Integer>();
		String key; int count, max = 0;
		try {
			rs = stmt.executeQuery(query);
			while (rs.next()) {
				count = Integer.parseInt(rs.getString(tileCols.length + 1).trim()) ;
				key = ""; 
				for (int i = 1; i <= tileCols.length; i++) {
					key += rs.getString(i).trim();
					if (i < tileCols.length)
						key += delim;
				}
				if (hash.containsKey(key))
					hash.put(key, hash.get(key)+count);
				else
					hash.put(key, count);
				if (hash.get(key) > max)
					max = hash.get(key);
			}
		} catch (SQLException e) {
			System.out.println(query);
			e.printStackTrace();
		}
		
		try {
			String id = generateJSONTile(hash, tileCols, max, csvDir, tileNums);
			//this.tilesGenerated.add(id);
		} catch (IOException e) {
			e.printStackTrace();
		}
		
		return max;
	}
	
	private String generateJSONTile(Map<String, Integer> hash, int [] tileCols, int globalMax, String csvDir, int [] tileNums) throws IOException {
		String key;
		int count = 0;
		int [] tile;
		int tileSize = 1;
		
		List<int []> tileParams = this.getTileParams(tileCols, tileNums);
		
		for (int i = 0; i < tileCols.length; i++) {
			tileSize *= tileParams.get(i)[2] - tileParams.get(i)[1] + 1;  //binCnts[tileCols[i]];
		}
		tile = new int [tileSize];
		
		//System.out.println(tileSize);
		
		if (tileCols.length == 3) {
			for (int i = tileParams.get(2)[1]; i <= tileParams.get(2)[2]; i++) {
				for (int j = tileParams.get(1)[1]; j <= tileParams.get(1)[2]; j++) {
					for (int k = tileParams.get(0)[1]; k <= tileParams.get(0)[2]; k++) {

							key = getBinRep(tileCols[0], k) + delim + getBinRep(tileCols[1], j) + delim + getBinRep(tileCols[2], i); 
							if (hash.containsKey(key)) {
								tile[count++] = hash.get(key);
							}
							else
								tile[count++] = 0;
					}
				}
			}
		} else {
			for (int l = tileParams.get(3)[1]; l <= tileParams.get(3)[2]; l++) {
				for (int i = tileParams.get(2)[1]; i <= tileParams.get(2)[2]; i++) {
					for (int j = tileParams.get(1)[1]; j <= tileParams.get(1)[2]; j++) {
						for (int k = tileParams.get(0)[1]; k < tileParams.get(0)[2]; k++) {

								key = getBinRep(tileCols[0], k) + delim + getBinRep(tileCols[1], j) 
										+ delim + getBinRep(tileCols[2], i) + delim + getBinRep(tileCols[3], l); 
								if (hash.containsKey(key)) {
									tile[count++] = hash.get(key);
								}
								else
									tile[count++] = 0;
						}
					}
				}
			}
		}
		
		JSONObject jsonTile = new JSONObject();
		JSONObject meta = new JSONObject();
		JSONObject obj;
		for (int i = 0; i < tileCols.length; i++) {
			obj = new JSONObject();
			obj.put("dim", tileCols[i]);
			obj.put("start", tileParams.get(i)[1]);
			obj.put("end", tileParams.get(i)[2]);
			obj.put("zmlevel", tileCols[i] <=1 ? zmLevels[tileCols[i]] : 0);
			meta.put(tileCols[i], obj);
		}
		
		String id = this.getTileIdx(tileCols, tileNums);// "0-0-173-0x1-0-173-0x5-0-6-0";
		jsonTile.put("tileId", id);
		jsonTile.put("meta", meta);
		jsonTile.put("globalMax", globalMax);
		jsonTile.put("data", Arrays.toString(tile));
		
		FileOutputStream output = new FileOutputStream(csvDir + id +".gz");
		Writer writer = new OutputStreamWriter(new GZIPOutputStream(output), "UTF-8");
		writer.write(jsonTile.toJSONString());
		writer.close();
		output.close();
		
//		FileWriter fstream = new FileWriter(csvDir + id +".tile");
//		BufferedWriter out = new BufferedWriter(fstream);
//		out.write(jsonTile.toJSONString());
//		//Close the output stream
//		out.close();
		
		return id;
	}
//	
//	private String getTileIdx(int [] tileCols) {
//		String idx = "";
//		int col;
//		for (int i = 0; i < tileCols.length; i++) {
//			col = tileCols[i];
//			idx += col + "-" + (int)Math.floor(min[col]/binSize[col]) + "-" + (int)Math.floor(max[col]/binSize[col]) + "-0";
//			if (i < tileCols.length - 1)
//				idx += "x";
//		}
//		return idx;
//	}
	
	public static void main (String [] args){
		File f = new File("/Users/zcliu/Dropbox/github/tiles/FAA/");
		File [] fList = f.listFiles();
		InputStream in;
		JSONObject obj;
		JSONParser parser = new JSONParser();
		
		for (File file : fList){
			if(!file.isDirectory()) continue;
			File [] tiles = file.listFiles();
			long max = 0;
			for (File tile : tiles){
				if (!tile.getName().endsWith(".gz"))	continue;
				try {
					in = new GZIPInputStream(new FileInputStream(tile));
					obj = (JSONObject) parser.parse(new InputStreamReader(in));
					if (Long.parseLong(obj.get("globalMax").toString()) > max)
						max = Long.parseLong(obj.get("globalMax").toString());
				} catch (FileNotFoundException e) {
					e.printStackTrace();
				} catch (IOException e) {
					e.printStackTrace();
				} catch (ParseException e) {
					e.printStackTrace();
				}
			}
			try {
				File tileComputed = new File(file.getAbsolutePath() + File.separator +"tilesComputed");
				// creates the file
				file.createNewFile();
				// creates a FileWriter Object
				FileWriter writer = new FileWriter(tileComputed); 
				// Writes the content to the file
				writer.write(Long.toString(max)); 
				writer.flush();
				writer.close();
			} catch (UnsupportedEncodingException e) {
				e.printStackTrace();
			} catch (IOException e) {
				e.printStackTrace();
			}
		}
	}
	
	public void close() {
		try {
            if (rs != null) {
                rs.close();
            }
            if (stmt != null) {
                stmt.close();
            }
            if (con != null) {
                con.close();
            }

        } catch (SQLException ex) {
        	ex.printStackTrace();
//            Logger lgr = Logger.getLogger(Version.class.getName());
//            lgr.log(Level.WARNING, ex.getMessage(), ex);
        }
	}

	public void createTrueDelayTable() {
		String query = "CREATE TABLE true_delays AS SELECT * FROM delays WHERE \"DepDelay\" > 0 and \"ArrDelay\" > 0";
		try {
			stmt.executeUpdate(query);
		} catch (SQLException e) {
			e.printStackTrace();
		}
	}

}
