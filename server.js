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
		lista += "<tr><td>" + videoName + "</td><td><a href=https://www.youtube.es/watch?v=" + videoId + ">Ver</a></td><td><a href=/sel/" + videoId + ">Descargar</a></td></tr>"
	}
	lista += "</table>";
	var out = fs.readFileSync('index.html').toString().replace('##LIST##', lista);
	writeHtml(out, response)
}

function downloadVideo(where, videoId, response) {
	exec("youtube-dl --extract-audio --audio-format mp3 https://www.youtube.es/watch?v=" + videoId + " -o \"/mnt/usb/" + where + "%(title)s.%(ext)s\"");
	if (lastSearch == "") {
		writeHtml("<script>window.location=/</script>", response);
	} else {
		callSearch(lastSearch, showList, response);
	}
}

function showWhereDownload(videoId, response) {
	var selectFolderHtml = fs.readFileSync('selectFolder.html').toString();
	var list_dir = fs.readdirSync('/mnt/usb/');
	var lst = "";
	for (var i = 0; i < list_dir.length; i++) {
		lst += "<li><a href=/des/" + videoId + "/" + list_dir[i] + ">" + list_dir[i] + "</a></li>";
	}
	selectFolderHtml = selectFolderHtml.replace("##LIST##", lst);
	writeHtml(selectFolderHtml, response);
}

function writeListDir(path, response, url) {
	var selectFolderHtml = fs.readFileSync('selectFolder.html').toString();
	var list_dir = fs.readdirSync(path);
	var lst = "";
	for (var i = 0; i < list_dir.length; i++) {
		lst += "<li><a href=/" + url + "/" + list_dir[i] + ">" + list_dir[i] + "</a></li>";
	}
	selectFolderHtml = selectFolderHtml.replace("##LIST##", lst);
	writeHtml(selectFolderHtml, response);
}


var server = http.createServer(function (req, res) {
        switch (req.method) {
                case "GET":
                        var path = url.parse(req.url).pathname;
                        var parts = path.split('/')
                        if (parts[1] == 'des') {
                        	//console.log("DES " + parts[2]);
                        	downloadVideo(parts[3],parts[2], res);
                        } else if (parts[1] == 'sel') {
                        	showWhereDownload(parts[2], res);
                        } else if(parts[1] == 'busc') {
                        	callSearch(parts[2], showList, res);
                        } else if(parts[1] == 'carp') {
                        	writeListDir('/mnt/usb/', res, 'list');
                        } else if(parts[1] == 'list') {
                        	writeListDir('/mnt/usb/' + parts[2], res, 'mus/' + parts[2]);
                        } else if(parts[1] == 'mus') {
                        	responseMusic('/mnt/usb/' + parts[2] + '/' + parts[3], res);
                        } else {
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