package imMens.db;

import java.io.File;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.text.SimpleDateFormat;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Hashtable;
import java.util.List;
import java.util.Map;
import java.util.Vector;
import java.util.logging.Level;
import java.util.logging.Logger;

public class PostgresTileComputerFAA implements Runnable{

	/**
	 * @param args
	 */
	private TileQueryMgr queryMgr;
	int [] colIdxs;
	String dbName, dir;
	
	public PostgresTileComputerFAA(String[] cols, int[] colTypes,
								double[] binSize, int[] zmLevels, double[] min, double[] max, List<String []> vals,
								int[] colIdxs, String dbName, String dir) {
		this.colIdxs = colIdxs;
		this.dbName = dbName;
		this.dir = dir;

		// vals.add(new String [] {"1", "2", "3", "4", "5", "6", "7"});
		String url = "jdbc:postgresql://localhost:5432/zcliu"; //"jdbc:postgresql://localhost:5432/postgres"; 
		String user = "zcliu"; //"postgres"; //
		String password = "82leo730"; //"bigdata"; //

		queryMgr = new TileQueryMgr(url, user, password);
		queryMgr.setColInfo(cols, colTypes, binSize, min, max, vals, zmLevels);
	}
	
	
	
	public static void main(String[] args) {
		final Calendar start = Calendar.getInstance();
    	
		Runtime.getRuntime().addShutdownHook(new Thread(new Runnable() {
			public void run() {
	        	Calendar cal = Calendar.getInstance();
	        	System.out.println("took " + (cal.getTimeInMillis() - start.getTimeInMillis())/60000.0 + " minutes");
	        }
	    }));
		
		/**
		 * begin edit
		 * FAA: depdelay, arrdelay, year, month, carriers, 
		 */
		
		final int[] colTypes = new int[] { TileQueryMgr.numeric,
				TileQueryMgr.numeric, TileQueryMgr.ordinal,
				TileQueryMgr.ordinal, TileQueryMgr.ordinal};
		final String[] cols = new String[] { "depdelay", "arrdelay", "year", "month", "uniquecarrier"};
		
		double [] min, max; String [] carriers; String dbName;
		//all 140+m flight info
		min = new double[] {-1410, -1437 - 1, 1987, 1, 0};
		max = new double[] {2601+1, 2598+2, 2008, 12, 0};
		carriers = new String []{"DL", "WN", "AA", "US", "UA", "NW", "CO", "MQ", "TW", "HP", "OO",
								"AS", "XE", "EV", "OH", "FL", "EA", "PI", "YV", "B6", "DH", "9E", "F9", "PA (1)",
								"HA", "TZ", "AQ", "PS", "ML (1)"};
		dbName = "faa_delay";
		
		//70m delays, where depdelay > 0 or arrdelay > 0
//		min = new double[] {-1410, -1410, 1987, 1, 0};
//		max = new double[] {2601+1, 2598+2, 2008, 12, 0};
//		carriers = new String []{"DL", "US", "AA", "WN", "UA", "NW", "CO", "HP", "TW", "MQ", "AS",
//									"OO", "XE", "EV", "PI", "OH", "FL", "EA", "B6", "YV", "DH", "9E",
//									"F9", "PA (1)", "TZ", "HA", "AQ", "PS", "ML (1)"
//									};
//		dbName = "true_delays";
		
		
		final List<String[]> vals = new ArrayList<String[]>();
		vals.add(null);
		vals.add(null);
		String[] temp = new String[22];
		for (int i = 0; i < 22; i++)
			temp[i] = Integer.toString(i+1987);
		vals.add(temp);

		
		temp = new String[12];
		for (int i = 0; i < 12; i++)
			temp[i] = Integer.toString(i+1);
		vals.add(temp);
		
		vals.add(carriers);

		
		//SimpleDateFormat sdf = new SimpleDateFormat("MMM d HH:mm:ss");
    	//System.out.println("started " + sdf.format(cal.getTime()) );
		for (int zm = 0; zm < 1; zm++) {
			final int [] zmLevels = new int []{zm,zm,0,0,0,1};
			final double[] binSize = new double [] {Math.pow(2, 4-zm), Math.pow(2, 4-zm), 1, 1, 1, 1};
			
			final String dir = "/Users/zcliu/Dropbox/github/tiles/FAA_full/";
			final List<int []> combo = new Vector<int []>();
//			combo.add(new int []{0,1,2});
//			combo.add(new int []{0,1,3});
//			combo.add(new int []{0,1,4});
			combo.add(new int []{2,3,4});
//			combo.add(new int []{0,1,5});
			
			for (int i = 0; i < combo.size(); i++){
				final String subDir = combo.get(i)[0] + "-" + zmLevels[combo.get(i)[0]] + "x" + 
								combo.get(i)[1] + "-" + zmLevels[combo.get(i)[1]] + "x" +
								combo.get(i)[2] + "-" + zmLevels[combo.get(i)[2]] + "/";
				
				File f = new File(dir + subDir);
				if (!f.exists())
					f.mkdir();
				
				PostgresTileComputerFAA ct = new PostgresTileComputerFAA(cols, colTypes, binSize, zmLevels, min, max, vals, combo.get(i), dbName, 
									dir + subDir);
				(new Thread(ct)).start();
				//queryMgr.computeTile(combo.get(i), zmLevels[0]%2==0 ? "brightkite" : "brightkite_odd",	dir + subDir);
			}
		}
	}
	
	@Override
	public void run() {
		queryMgr.computeTile( colIdxs, dbName, dir );
		queryMgr.close();
//		Tile2PngPacker packer = new Tile2PngPacker(dir, 17515);
//		packer.pack(true);
	}
}


