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

public class PostgresTileComputer implements Runnable{

	/**
	 * @param args
	 */
	private TileQueryMgr queryMgr;
	int [] colIdxs;
	String dbName, dir;
	
	public PostgresTileComputer(String[] cols, int[] colTypes,
								double[] binSize, int[] zmLevels, double[] min, double[] max, List<String []> vals,
								int[] colIdxs, String dbName, String dir) {
		this.colIdxs = colIdxs;
		this.dbName = dbName;
		this.dir = dir;

		// vals.add(new String [] {"1", "2", "3", "4", "5", "6", "7"});
		String url = "jdbc:postgresql://localhost:5432/zcliu";
		String user = "zcliu";
		String password = "82leo730";

		queryMgr = new TileQueryMgr(url, user, password);
		queryMgr.setColInfo(cols, colTypes, binSize, min, max, vals, zmLevels);
	}
	
	
	
	public static void main(String[] args) {
		// FAA dataset
		final Calendar start = Calendar.getInstance();
    	
		Runtime.getRuntime().addShutdownHook(new Thread(new Runnable() {
			public void run() {
	        	Calendar cal = Calendar.getInstance();
	        	System.out.println("took " + (cal.getTimeInMillis() - start.getTimeInMillis())/60000.0 + " minutes");
	        }
	    }));
		
		final int[] colTypes = new int[] { TileQueryMgr.numeric,
				TileQueryMgr.numeric, TileQueryMgr.ordinal,
				TileQueryMgr.ordinal, TileQueryMgr.ordinal, TileQueryMgr.ordinal};
		
		final double[] binSize = new double [] {2, 2, 1, 1, 1, 1};
		
		final double[] min = new double[] {0, 0, 0, 0, 0, 0};
		
		final List<String[]> vals = new ArrayList<String[]>();
		vals.add(null);
		vals.add(null);
		String[] temp = new String[12];
		for (int i = 0; i < 12; i++)
			temp[i] = Integer.toString(i);
		vals.add(temp);

		temp = new String[31];
		for (int i = 0; i < 31; i++)
			temp[i] = Integer.toString(i);
		vals.add(temp);

		temp = new String[24];
		for (int i = 0; i < 24; i++)
			temp[i] = Integer.toString(i);
		vals.add(temp);
		
		vals.add(new String[]{"u8483", "u69", "u102", "u2278", "u7125", "u560", "u9112", "u4", "u677", "u824",
				"u3642", "u8155", "u57190", "u14886", "u47889", "u13489", "u9568", "u431", "u4988", "u7757",
				"u10247", "u32712", "u14181", "u12201", "u26007", "u5751", "u30488", "u27787", "u37367", "u4760"});
		
		//SimpleDateFormat sdf = new SimpleDateFormat("MMM d HH:mm:ss");
    	//System.out.println("started " + sdf.format(cal.getTime()) );
		for (int zm = 9; zm <=10; zm++) {
			final String[] cols = new String[] { zm%2 == 0 ? "x_"+zm : "x_"+zm, zm%2 == 0 ? "y_"+zm : "y_"+zm, "month",
					"day", "hour", "uid"};
			final int [] zmLevels = new int []{zm,zm,0,0,0,1};
			
			final double[] max = new double[] {256 * Math.pow(2.0, zm*1.0) - 1, 256 * Math.pow(2.0, zm*1.0) - 1, 11, 30, 23, 29};
			
			//tComp.execute(cols, colTypes, binSize, zmLevels, min, max);
			
			final String dir = "/Users/zcliu/level9-10/";
			final List<int []> combo = new Vector<int []>();
			combo.add(new int []{0,1,2});
			combo.add(new int []{0,1,3});
			combo.add(new int []{0,1,4});
//			combo.add(new int []{2,3,4});
			combo.add(new int []{0,1,5});
			
			for (int i = 0; i < combo.size(); i++){
				final String subDir = combo.get(i)[0] + "-" + zmLevels[combo.get(i)[0]] + "x" + 
								combo.get(i)[1] + "-" + zmLevels[combo.get(i)[1]] + "x" +
								combo.get(i)[2] + "-" + zmLevels[combo.get(i)[2]] + "/";
				
				File f = new File(dir + subDir);
				if (!f.exists())
					f.mkdir();
				
				PostgresTileComputer ct = new PostgresTileComputer(cols, colTypes, binSize, zmLevels, min, max, vals, combo.get(i), zmLevels[0]%2==0 ? "brighitkite_even" : "brighitkite_odd", 
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
//		if (colIdxs[0] == 0 && colIdxs[1] == 1)
//			packer.pack(true);
//		else
//			packer.pack(false);
	}
}


