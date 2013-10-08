package imMens.db;

import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;

import javax.imageio.ImageIO;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;

public class GlobalMinUpdater {

	/**
	 * @param args
	 */
	File tileDir;
	
	public GlobalMinUpdater(String dir) {
		tileDir = new File(dir);
	}
	
	public void run() {
		JSONParser parser = new JSONParser();
		File [] fList = tileDir.listFiles();
		BufferedImage img = null;
		JSONArray dat;
		long max = 0, min = 1000;
		for (File file : fList){
			try {
				if(!file.getName().endsWith(".png")) continue;
			    img = ImageIO.read(file);
			    dat = new JSONArray();
			    		//Integer [img.getWidth() * img.getHeight() * 2];
			    
			    //int c = 0;
			    for (int y = 0; y < img.getHeight(); y++){
			    	for (int x = 0; x < img.getWidth(); x++){
			    		int v = img.getRGB(x, y);
			    		
			    		dat.add((0x0000FF00 & v) | ((0x00FF0000 & v) >> 16));
			    		dat.add((0xFF000000 & v) >> 16 | (0x000000FF & v));
			    	}
			    }
			    //System.out.println(dat.toString());
			    long [] result = getMaxProjectionInTile(new Integer[] {0,1}, dat, file.getName().replace(".png", ""));
 			    if (result[0] > max)
 			    	max = result[0];
 			    if (result[1] > 0 && result[1] < min)
 			    	min = result[1];
			    
 			    if (min == 1) {
 			    	System.out.println(tileDir + File.separator + "meta.json");
 					JSONObject obj = (JSONObject) parser.parse(new FileReader(new File(tileDir + File.separator + "meta.json")));
 			    	JSONObject temp = new JSONObject();
 			    	temp.put("0x1", min);
 			    	obj.put("globalMinProj", temp);
 			    	FileWriter f = new FileWriter(tileDir + File.separator + "meta.json" );
 					f.write(obj.toJSONString());
 					f.flush();
 					f.close();
 					break;
 			    }
 			    
			} catch (IOException e) {
				System.out.println(e);
			} catch (ParseException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}//for each img
		System.out.println(max + ", " + min);
		if (min > 1){
			JSONObject obj;
			try {
				obj = (JSONObject) parser.parse(new FileReader(new File(tileDir + File.separator + "meta.json")));
			    JSONObject temp = new JSONObject();
		    	temp.put("0x1", min);
		    	obj.put("globalMinProj", temp);
		    	FileWriter f = new FileWriter(tileDir + File.separator + "meta.json" );
				f.write(obj.toJSONString());
				f.flush();
				f.close();
			} catch (ParseException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			} catch (IOException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		    	
		}
	}
	
	private long [] getMaxProjectionInTile(Integer [] cols, JSONArray dat, String id){
		
		String [] dims = id.split("x");
		String [] temp;
		Integer [] allCols = new Integer [dims.length];
		int [] binCnts = new int [dims.length];
		int [] offsets = new int [dims.length];
		int [] alphas = new int [dims.length - cols.length];
		int [] alphaIdx = new int [dims.length - cols.length];
		int [] colIdx = new int [cols.length];
		for (int i = 0; i < dims.length; i++){
			temp = dims[i].split("-");
			allCols[i] = Integer.parseInt(temp[0]);
			binCnts[i] = Integer.parseInt(temp[2]) - Integer.parseInt(temp[1]) + 1;
			offsets[i] = i == 0 ? 1 : offsets[i-1] * binCnts[i-1];
		}
		
		List<Integer> uCols = Arrays.asList(cols);
		int c = 0;
		for (int i = 0; i < allCols.length; i++){
			if (uCols.indexOf(allCols[i]) == -1){
				alphas[c] = allCols[i];
				alphaIdx[c] = i;
				c++;
			} else {
				colIdx[uCols.indexOf(allCols[i])] = i;
			}
		}
		long max = 0, min = 100000;
		
		for (int xbin = 0; xbin < binCnts[colIdx[0]]; xbin++){
			for (int ybin = 0; ybin < binCnts[colIdx[1]]; ybin++){
				long r = 0;
				int start = xbin*offsets[colIdx[0]] + ybin*offsets[colIdx[1]];
				for (int alpha = 0; alpha < binCnts[alphaIdx[0]]; alpha++){
					r += (Integer) dat.get(start + alpha * offsets[alphaIdx[0]]);
				}
				if (r > max)
					max = r;
				if (r > 0 && r < min)
					min = r;
			}
		}
		
		return new long []{max, min};
	}
	
	public static void main(String[] args) {
		File f = new File("/Users/zcliu/Dropbox/github/imMens/tiles-png/brightkite/");
		for (File d : f.listFiles()){
			if (!d.isDirectory() || d.getName().startsWith("0-9"))	continue;
			GlobalMinUpdater gmu = new GlobalMinUpdater(d.getAbsolutePath());
			gmu.run();
		}
		
	}

}
