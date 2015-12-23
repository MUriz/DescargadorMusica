var exec = require("child_process").exec;
var http = require("http");
var url = require("url");
var https = require("https");
var fs = require('fs');

var org_html = fs.readFileSync('index.html').toString();

function callSearch(text, showCallback, response) {
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

function showList(results, response) {
	var lista = "<ul>";
	for(var i = 0; i < results.items.length; i++) {
		var videoId = results.items[i].id.videoId;
		var videoName = results.items[i].snippet.title;
		lista += "<li>" + videoName + "<a href=https://www.youtube.es/watch?v=" + videoId + ">Ver</a><a hred=/des/" + videoId + ">Descargar</a></li>"
	}
	lista += "</ul>";
	var out = org_html.replace('##LIST##', lista);
	response.setHeader('Content-Length', Buffer.byteLength(out));
	response.setHeader('Content-Type', 'text/html');
	response.end(out);
}

function downloadVideo(videoId) {
	exec("youtube-dl --extract-audio --audio-format mp3 https://www.youtube.es/watch?v=" + videoId);
}


var server = http.createServer(function (req, res) {
        switch (req.method) {
                case "GET":
                        var path = url.parse(req.url).pathname;
                        var parts = path.split('/')
                        if (parts[1] == 'des') {
                        	downloadVideo(parts[1]);
                        } else if(parts[1] == 'busc') {
                        	callSearch(parts[1], showList, res);
                        } else {
                        	var out = org_html.replace('##LIST##', '');
                        	res.setHeader('Content-Length', Buffer.byteLength(out));
                        	res.setHeader('Content-Type', 'text/html');
                        	res.end(out);
                        }
                        break;
                default:
                        console.log("UNKNOWN METHOD");
                        break;
        }
});

server.listen(80, '0.0.0.0');