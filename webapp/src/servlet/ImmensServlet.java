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
	private String userHome = System.getProperty("user.home");
	
	public ImmensServlet() {
        super();
    }

    public void init(ServletConfig config) throws ServletException {
    	super.init(config);
    	
    	String tileBaseLocalURL = "/Users/leoli/Dropbox/github/tiles"; //userHome + File.separator + "<tile folder>"; 
    	
    	DataSetManager brightkite = new DataSetManager("0", tileBaseLocalURL, "brightkite", config.getServletName());
    	brightkite.init();
    	DataSetManager faa = new DataSetManager("1", tileBaseLocalURL, "FAA_full", config.getServletName());
    	faa.init();
    	datasets.put("0", brightkite);
    	datasets.put("1", faa);
    }
    
    public void doGet(HttpServletRequest req, HttpServletResponse res) throws ServletException, IOException {
    	String q = req.getParameter("q");
    	String meta = req.getParameter("meta");
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
