var exec = require("child_process").exec;
var http = require("http");
var url = require("url");
var https = require("https");
var fs = require('fs');

var lastSearch = "";

function callSearch(text, showCallback, response) {
	lastSearch = text;
	var options = {
	  host: 'www.googleapis.com',
	  port: 443,
	  path: '/youtube/v3/search?part=snippet&q=' + text + '&type=video&maxResults=50&order=relevance&key=AIzaSyBIst9lkttBlzHwJAbcVNsn0oA-bAjSGkY',
	  method: 'GET'
	};
	var req = https.request(options, function(res) {
  		var data = '';
	 	res.on('data', function(d) {
	    	data += d;
	  	});
	  	res.on('end', function() {
	  		showCallback(JSON.parse(data), response);
	  	})
	});
	req.end();

	req.on('error', function(e) {
	  console.error(e);
	});
}

function responseMusic(mp3_file, response) {
    var stat = fs.statSync(mp3_file);

    response.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': stat.size
    });

    var readStream = fs.createReadStream(filePath);
    readStream.pipe(response);
}

function replaceChars(str) {
	retStr = str;
	retStr = retStr.replace(/á/g, "a");
	retStr = retStr.replace(/é/g, "e");
	retStr = retStr.replace(/í/g, "i");
	retStr = retStr.replace(/ó/g, "o");
	retStr = retStr.replace(/ú/g, "u");
	retStr = retStr.replace(/Á/g, "A");
	retStr = retStr.replace(/É/g, "E");
	retStr = retStr.replace(/Í/g, "I");
	retStr = retStr.replace(/Ó/g, "O");
	retStr = retStr.replace(/Ú/g, "U");
	retStr = retStr.replace(/ñ/g, "n");
	retStr = retStr.replace(/Ñ/g, "N");
	retStr = retStr.replace(/\?/g, '');
	retStr = retStr.replace(/\*/g, '');
	retStr = retStr.replace(/\\/g, '');
	retStr = retStr.replace(/\//g, '');
	retStr = retStr.replace(/ /g, '+');
	retStr = retStr.replace(/\-/g, '');
	retStr = retStr.replace(/\(/g, '');
	retStr = retStr.replace(/\)/g, '');
	return retStr;
}

function writeHtml(html, response) {
	response.setHeader('Content-Length', Buffer.byteLength(html));
	response.setHeader('Content-Type', 'text/html');
	response.end(html);
}

function showList(results, response) {
	var lista = "<table>";
	for(var i = 0; i < results.items.length; i++) {
		var videoId = results.items[i].id.videoId;
		var videoName = results.items[i].snippet.title;
		var videoNameUri = replaceChars(videoName);
		lista += "<tr><td>" + videoName + "</td><td><a href=https://www.youtube.es/watch?v=" + videoId + ">Ver</a></td><td><a href=/sel/" + videoId + "/?name=" + videoNameUri + ">Descargar</a></td></tr>"
	}
	lista += "</table>";
	var out = fs.readFileSync('index.html').toString().replace('##LIST##', lista);
	writeHtml(out, response)
}

function downloadVideo(where, videoId, videoName, response) {
	//console.log("sudo youtube-dl --extract-audio --audio-format mp3 https://www.youtube.es/watch?v=" + videoId + " -o \"/mnt/usb/" + where + "%(title)s.%(ext)s\"");
	exec("sudo youtube-dl --extract-audio --audio-format mp3 https://www.youtube.es/watch?v=" + videoId + " -o \"" + videoName + ".%(ext)s\"");
	console.log("sudo youtube-dl --extract-audio --audio-format mp3 https://www.youtube.es/watch?v=" + videoId + " -o \"" + videoName + ".%(ext)s\"");
	//exec("sudo youtube-dl --extract-audio --audio-format mp3 https://www.youtube.es/watch?v=" + videoId);
	if (lastSearch == "") {
		writeHtml("<script>window.location=/</script>", response);
	} else {
		callSearch(lastSearch, showList, response);
	}
}

function showWhereDownload(videoId, videoName, response) {
	var selectFolderHtml = fs.readFileSync('selectFolder.html').toString();
	var list_dir = fs.readdirSync('/mnt/usb/');
	var lst = "";
	for (var i = 0; i < list_dir.length; i++) {
		lst += "<li><a href=/des/" + videoId + "/?name=" + videoName + "&w=" + list_dir[i] + ">" + list_dir[i] + "</a></li>";
	}
	selectFolderHtml = selectFolderHtml.replace("##LIST##", lst);
	writeHtml(selectFolderHtml, response);
}

function writeListDir(path, response, url) {
	var selectFolderHtml = fs.readFileSync('selectFolder.html').toString();
	var list_dir = fs.readdirSync(path);
	var lst = "";
	for (var i = 0; i < list_dir.length; i++) {
		lst += "<li><a href=/" + url + "/?w=" + list_dir[i] + ">" + list_dir[i] + "</a></li>";
	}
	selectFolderHtml = selectFolderHtml.replace("##LIST##", lst);
	writeHtml(selectFolderHtml, response);
}

function htmlUriToJSON(str) {
	var parts = str.split('&');
	var a = "{";
	for (var i = 0; i < parts.length; i++) {
		var p = parts[i].split('=');
		a += "\"" + p[0] + "\" : \"" + p[1] + "\","; 
	}
	a = a.substr(0, a.length-1) + "}";
	return JSON.parse(a);
}

var server = http.createServer(function (req, res) {
        switch (req.method) {
                case "GET":
                		console.log(req.url);
                        var path = url.parse(req.url).pathname;
                        var query = url.parse(req.url).query;
                        var parts = path.split('/')
                        if (parts[1] == 'des') {
                        	//URL ==> /des/videoId/?name=videoName&w=folder
                        	var videoId = parts[2]
                        	var params = htmlUriToJSON(query);
                        	//console.log("DES " + parts[2]);
                        	console.log(query);
                        	downloadVideo(params.w,videoId,params.name,res);
                        } else if (parts[1] == 'sel') {
                        	//URL => /sel/videoId/?name=videoName
                        	console.log(query);
                        	var videoId = parts[2]
                        	var params = htmlUriToJSON(query);
                        	showWhereDownload(videoId, params.name, res);
                        } else if(parts[1] == 'busc') {
                        	//URL => /busc/?txt=text
                        	var params = htmlUriToJSON(query);
                        	callSearch(params.txt, showList, res);
                        } else if(parts[1] == 'carp') {
                        	//URL => /carp/
                        	writeListDir('/mnt/usb/', res, 'list');
                        } else if(parts[1] == 'list') {
                        	//URL => /list/?w=asd
                        	var params = htmlUriToJSON(query);
                        	writeListDir('/mnt/usb/' + params.w, res, 'mus/' + params.w);
                        } else if(parts[1] == 'mus') {
                        	//URL => /mus/folder/?w=file
                        	var params = htmlUriToJSON(query);
                        	responseMusic('/mnt/usb/' + parts[2] + '/' + params.w, res);
                        } else if (path == '/') {
                        	var out = fs.readFileSync('index.html').toString();
                        	out = out.replace('##LIST##', '');
                        	writeHtml(out, res);
                        }
                        break;
                default:
                        console.log("UNKNOWN METHOD");
                        break;
        }
});

server.listen(8080, '0.0.0.0');