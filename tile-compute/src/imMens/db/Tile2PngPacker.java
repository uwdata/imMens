package imMens.db;

import java.awt.image.BufferedImage;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.zip.GZIPInputStream;

import javax.imageio.ImageIO;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;


public class Tile2PngPacker {

	/**
	 * @param args
	 * @throws ParseException 
	 * @throws IOException 
	 * @throws FileNotFoundException 
	 */
	File tileDir;// = new File("/Users/zcliu/Dropbox/github/imMens/WebContent/tiles-png/brightkite/0-7x1-7x2-0/");
	long max;
	
	public Tile2PngPacker(String dir, long max) {
		tileDir = new File(dir);
		this.max = max;
	}
	
	public void pack(boolean computeGeoProj) {
		JSONParser parser = new JSONParser();
		
		File [] fList = tileDir.listFiles();

		JSONObject obj, meta;
		JSONArray dat;
		int [] pixDat = new int [4];
		long globalMax = max;
		BufferedImage canvas;
		
		JSONObject metaObj = new JSONObject(), temp;
		JSONObject maxGlobalProjection = new JSONObject();
		JSONObject minGlobalProjection = new JSONObject();
		long maxGeoProjection = 0, minGeoProjection = 100000;
		InputStream in;
		
		double [] pt = new double[121];
		//int count = 0;
		
		for (File file : fList){
			
			if(!file.getName().endsWith(".gz")) continue;
			//if (count > 120) break;
			
			Date d1 = new Date();
			
			//obj = (JSONObject) parser.parse(new FileReader( file ));
			try {
				in = new GZIPInputStream(new FileInputStream(file));
				obj = (JSONObject) parser.parse(new InputStreamReader(in));
				
				meta = (JSONObject) obj.get("meta");
				
				//globalMax = (Long) obj.get("globalMax");
				
				if (!(obj.get("data") instanceof JSONArray))
					dat = (JSONArray)parser.parse((String) obj.get("data"));
				else
					dat = (JSONArray) obj.get("data");
				
				String id = file.getName().replace(".gz", "");
				if (computeGeoProj){
					long [] geoProjection = this.getMaxProjectionInTile(new Integer [] {0, 1}, dat, id);
					if (geoProjection[0] > maxGeoProjection)
						maxGeoProjection = geoProjection[0];
					if (geoProjection[1] < minGeoProjection)
						minGeoProjection = geoProjection[1];
				}
				//System.out.println("max in tile " + id + ": " + geoProjection);
				
				int imgSize = (int) logCeil (Math.ceil(Math.sqrt(dat.size() / 2)), 2);
				//System.out.println(imgSize);
				
				canvas = new BufferedImage(imgSize, 
	                    imgSize, 
	                    BufferedImage.TYPE_INT_ARGB);
				
				long val; //dataSum = 0;
				double factor = globalMax > 65535 ? 65535*1.0/globalMax : 1;
				;
				int imgOffset = 0, pixMax = 0, pixSum = 0;
				for (int offset = 0; offset < dat.size(); offset++){
					
					val = (Long) dat.get(offset++);
					//dataSum += val;
					val =  normalize( val, globalMax, 65535 );
					pixDat[0] = (int) (0x000000FF & val);					//R
					pixDat[1] = (int) (0x0000FF00 & val) >> 8;
					//pixDat[1] = (int) (0x80 | ((0x0000FF00 & val) >> 8) );
					pixSum += val;
					if (val > pixMax)	pixMax = (int) val;
					
					if (offset < dat.size()){
						val = (Long) dat.get(offset);
						//dataSum += val;
						val =  normalize( val, globalMax, 65535 );
						pixDat[2] = (int) (0x000000FF & val);					//B
						pixDat[3] = (int) (0x0000FF00 & val) >> 8;
						//pixDat[3] = (int) (0x80 | ((0x0000FF00 & val) >> 8) ); //A
						pixSum += val;
						if (val > pixMax)	pixMax = (int) val;
					} else {
						pixDat[2] = 0;
						pixDat[3] = 0;
					}
					
					//pixDat channel order: a r g b
					int pix =  (pixDat[3] << 24) | (pixDat[0] << 16) | (pixDat[1] << 8) | pixDat[2];
					canvas.setRGB((imgOffset/4)%imgSize, (imgOffset/4)/imgSize, pix);
					imgOffset += 4;
				}
				
				for (; imgOffset < imgSize * imgSize * 4; imgOffset += 4) {
					canvas.setRGB((imgOffset/4)%imgSize, (imgOffset/4)/imgSize, 0);
				}
				
				temp = new JSONObject();
				temp.put("meta", meta);
//				temp.put("dataSum", dataSum);
//				temp.put("pixSum", pixSum);
//				temp.put("pixMax", pixMax);
				temp.put("factor", factor);
				
				metaObj.put(id, temp);				
				//System.out.println(id + " " + dataSum + " "  + pixSum + " " + pixMax + " " + factor);
				
				ImageIO.write(canvas, "PNG", new File(tileDir + File.separator + id + ".png" ));
				//file.delete();
				in.close();
				
			} catch (FileNotFoundException e) {
				e.printStackTrace();
			} catch (IOException e) {
				e.printStackTrace();
			} catch (ParseException e) {
				e.printStackTrace();
			} catch (Exception e) {
				e.printStackTrace();
			}
			
			Date d2 = new Date();
//			pt[count] = d2.getTime() - d1.getTime();
//			count ++;
		}//end for
		
		//System.out.println(tileDir + " " + average(pt));
		
		try {
			if (computeGeoProj){
				maxGlobalProjection.put("0x1", maxGeoProjection);
				minGlobalProjection.put("0x1", minGeoProjection);
				metaObj.put("globalMaxProj", maxGlobalProjection);
				metaObj.put("globalMinProj", minGlobalProjection);
			}
			FileWriter file = new FileWriter(tileDir + File.separator + "meta.json" );
			file.write(metaObj.toJSONString());
			file.flush();
			file.close();
	 
		} catch (IOException e) {
			e.printStackTrace();
		} catch (Exception e) {
			e.printStackTrace();
		}
		
		//deleteGZips();
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
	
	//cols {2,3}, id: 2-0-1x3-0-2x5-0-3
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
		
//		System.out.println(id);
//		System.out.println("allCols" + Arrays.toString(allCols));
//		System.out.println("bincnts" + Arrays.toString(binCnts));
//		System.out.println("alphas" + Arrays.toString(alphas));
//		System.out.println("alphaIdx" + Arrays.toString(alphaIdx));
//		System.out.println("colIdx" + Arrays.toString(colIdx));
//		System.out.println("offsets" + Arrays.toString(offsets));
		
		long max = 0, min = 100000, sum = 0;
		
		for (int xbin = 0; xbin < binCnts[colIdx[0]]; xbin++){
			for (int ybin = 0; ybin < binCnts[colIdx[1]]; ybin++){
				long r = 0;
				int start = xbin*offsets[colIdx[0]] + ybin*offsets[colIdx[1]];
				for (int alpha = 0; alpha < binCnts[alphaIdx[0]]; alpha++){
					r += (Long) dat.get(start + alpha * offsets[alphaIdx[0]]);
				}
				if (r > max)
					max = r;
				if (r > 0 && r < min)
					min = r;
				sum += r;
			}
		}
		System.out.println(id + "," + sum);
		return new long []{max, min};
	}
	
	public static void main(String[] args) throws ParseException, NumberFormatException, IOException  {
		String d = "/Users/zcliu/Dropbox/github/tiles/FAA_full";
		BufferedReader br;
		for (File f : new File(d).listFiles()){
			if (!f.isDirectory())	continue;
			br = new BufferedReader(new FileReader(f.getAbsolutePath() + File.separator + "tilesComputed"));
			int max = Integer.parseInt(br.readLine());
			Tile2PngPacker test = new Tile2PngPacker(f.getAbsolutePath(), max);
			System.out.println(f.getAbsolutePath() + "\t" + max);
			br.close();
			test.pack(f.getName().startsWith("0-"));
		}
		
		
//		JSONParser parser = new JSONParser();
		
//		JSONArray dat = (JSONArray) parser.parse("[0,1,2,4,0,1,3,2,5,2,7,1,3,0,0,0,0,4,1,2,0,4,6,2]");
//		System.out.println(test.getMaxProjectionInTile(new Integer [] {2, 3}, dat, "2-0-1x3-0-2x5-0-3"));
		//File inDir = new File("/Users/zcliu/Dropbox/github/imMens/WebContent/tiles-png/brightkite/0-7x1-7x2-0/");
		//File outDir = new File("/Users/zcliu/Dropbox/github/imMens/WebContent/tiles-png/brightkite/0-7x1-7x2-0/");
	}
	
	private void deleteGZips() {
		File [] fList = tileDir.listFiles();

		for(int i = 0; i < fList.length; i++){
			if(!fList[i].getName().endsWith(".gz")) continue;
			fList[i].delete();
		}
	}

	private static double logCeil(double d, int b){
		return (d > 0) ? Math.pow(b, Math.ceil(Math.log(d) / Math.log(b)))
				: -Math.pow(b, -Math.ceil(-Math.log(-d) / Math.log(b)));
	}
	
	private static int normalize (long v, long max, int upperLim) {
		
		if (v == 0)	return 0;
		
		if (max < upperLim)	return (int) v;
		
		return (int) (1 + Math.floor(v * (upperLim - 1) / max));
	}
}
