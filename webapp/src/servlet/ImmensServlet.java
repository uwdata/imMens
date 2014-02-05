package servlet;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileWriter;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.util.Calendar;
import java.util.Hashtable;
import java.util.Map;
import java.util.Scanner;
import java.util.zip.GZIPOutputStream;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.json.simple.parser.ParseException;

@WebServlet("/ImmensServlet")
public class ImmensServlet extends HttpServlet {
	private static final long serialVersionUID = 1L;
	
	private Map<String, DataSetManager> datasets = new Hashtable<String, DataSetManager>();
	private Map<String, BufferedWriter> writers = new Hashtable<String, BufferedWriter>();
	private String logDir, processedEvtLogDir; 
	private String userHome = System.getProperty("user.home");
			//"/Users/zcliu/Dropbox/bigdata/logs";
	
	public ImmensServlet() {
        super();
        logDir = userHome + File.separator + "Dropbox/bigdata/imMens-CHI-data/logs";
        processedEvtLogDir = userHome + File.separator + "Dropbox/bigdata/imMens-CHI-data/processed-evt-logs";
    }

    public void init(ServletConfig config) throws ServletException {
    	super.init(config);
    	String os = System.getProperty("os.name").toLowerCase();
    	
    	String tileBaseLocalURL = ""; 
    	
    	if (os.indexOf("win") >= 0){
    		tileBaseLocalURL = "C:\\Program Files\\jetty\\webapps\\tiles-png\\";
    	} else if (os.indexOf("mac") >= 0){
    		tileBaseLocalURL = userHome + File.separator + "Dropbox/github/tiles/";
    	} else if (os.indexOf("nix") >= 0 || os.indexOf("nux") >= 0 || os.indexOf("aix") > 0){
    		tileBaseLocalURL = "/u/zcliu/Documents/tiles-png/";
    	}
    	
    	DataSetManager brightkite = new DataSetManager("0", tileBaseLocalURL, "brightkite");
    	brightkite.init();
    	DataSetManager faa = new DataSetManager("1", tileBaseLocalURL, "FAA_full");
    	faa.init();
    	datasets.put("0", brightkite);
    	datasets.put("1", faa);
    }
    
    public void doGet(HttpServletRequest req, HttpServletResponse res) throws ServletException, IOException {
    	String q = req.getParameter("q");
    	String meta = req.getParameter("meta");
    	String subject = req.getParameter("subject");
    	String dataset = req.getParameter("dataset");
    	String pngTile = req.getParameter("pngTile");
		
    	if (q!=null){
    		try {
    			zipAndSend(req, res, this.datasets.get(dataset).getTileInfo(q).toJSONString());
    		} catch (IOException e) {
    			e.printStackTrace();
    		}
        	//doGetTileJSON(req, res, q, dataset);
    	} 
    	else if (pngTile != null) {
    		try {
    			res.setContentType("image/png");
    			OutputStream out = res.getOutputStream();
    			byte [] pngT = this.datasets.get(dataset).getPNGTile(pngTile);
    			res.setContentLength(pngT.length);
    			out.write(pngT);
    			out.close();
    		} catch (IOException e) {
    			e.printStackTrace();
    		}
    	}
    	else if (meta!=null){
    		try {
    			zipAndSend(req, res, this.datasets.get(dataset).getMeta().toJSONString());
    		} catch (IOException e) {
    			e.printStackTrace();
    		}
    	}
    	else if (subject !=null) {
    		String delay = req.getParameter("delay");
    		String logName = subject+"-"+dataset+"-"+delay+"-imMensEvt.txt";
    		File f = new File(logDir + File.separator + logName);
    		if (f.exists()){
    			String entireFileText = new Scanner(f).useDelimiter("\\A").next();
    			try {
        			zipAndSend(req, res, entireFileText);
        		} catch (IOException e) {
        			e.printStackTrace();
        		}
    		} else {
    			System.out.println(logName + " does not exist");
    		}
    	}
	}
    
    public void doPost(HttpServletRequest req, HttpServletResponse res)throws ServletException, IOException 
	{    
    	String processed = req.getParameter("processed");
    	String type = req.getParameter("type");
        String subject = req.getParameter("subject");
		String time = req.getParameter("time");
		String dataset = req.getParameter("dataset");
		String delay = req.getParameter("delay");
    	if (processed != null){
    		String file = subject + "-" + dataset + "-" + delay + "-" +  "imMensEvt.txt";
    		File ofile = new File(processedEvtLogDir + File.separator + file);
    		if (!writers.containsKey(file)||!ofile.exists()){
    			FileWriter fstream = new FileWriter(processedEvtLogDir + File.separator + file, true);
    	        BufferedWriter out = new BufferedWriter(fstream);
    	        writers.put(file, out);
    		}
    		writers.get(file).write(req.getParameter("line").replace("\n", "").replace("\r", "")+"\r\n");
        	writers.get(file).flush();
    	}
    	else {
    		String file = subject + "-" + dataset + "-" + delay + "-" + type + ".txt";
    		if (!writers.containsKey(file)){
    			FileWriter fstream = new FileWriter(logDir + File.separator + file, true);
    	        BufferedWriter out = new BufferedWriter(fstream);
    	        writers.put(file, out);
    		}
    		
            if (type.equalsIgnoreCase("mouseEvt")){
            	String x = req.getParameter("x");
            	String y = req.getParameter("y");
            	String state = req.getParameter("vis");
            	String event = req.getParameter("event");
            	writers.get(file).write(subject + "," + time + "," + x + "," + y + "," + event + "," + state + "\r\n");
            	//writers.get(file).newLine();
            	writers.get(file).flush();
            } else {
            	String action = req.getParameter("action");
        		String spec = req.getParameter("spec");
        		String value = req.getParameter("value");
        		writers.get(file).write(subject + "," + time + "," + action + "," + spec + "," + value + "\r\n");
        		//writers.get(file).newLine();
        		writers.get(file).flush();
            }
    	}
    	

	}
    
    private void zipAndSend(HttpServletRequest req, HttpServletResponse res, String data) throws IOException{
    	String encoding = req.getHeader("Accept-Encoding");
		boolean canGzip = false;

		if (encoding != null)
			if (encoding.indexOf("gzip") >= 0)
				canGzip = true;
		
		if (canGzip) {
			res.setHeader("Content-Encoding", "gzip");
			OutputStream o = res.getOutputStream();
			GZIPOutputStream gz = new GZIPOutputStream(o);

			gz.write(data.getBytes());
			gz.close();
			o.close();
		} else { // no compression
			res.setContentType("application/json");
			PrintWriter out = res.getWriter();
			out.print(data);
			out.flush();
			out.close();
		}
    }
	
}
