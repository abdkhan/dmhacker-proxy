var express = require('express');
var urlExists = require('url-exists');
var request = require('request');
var http = require('http');
var httpHeaders = require('http-headers');
var fs = require('fs');
var mkdirp = require('mkdirp');
var download = require('url-download');

var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
    response.render('index');
});

app.get('/exists/:b64url', function(req, res) {
    var rawUrl = new Buffer(req.params.b64url, 'base64').toString('ascii');
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
        rawUrl = 'http://' + rawUrl;
    }
    urlExists(rawUrl, function(err, exists) {
        res.status(200).json({
            exists: exists
        });
    });
});

// Where the magic happens
app.get('/site/:b64url', function(req, res) {
    var rawUrl = new Buffer(req.params.b64url, 'base64').toString('ascii');
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
        rawUrl = 'http://' + rawUrl;
    }
    urlExists(rawUrl, function(err, exists) {
        if (exists) {
            var urlObject = require('url').parse(rawUrl);
            var urlLink = urlObject.protocol + (urlObject.slashes ? '//' : '') + urlObject.hostname + '/' + urlObject.pathname;
            http.request({
                method: 'HEAD',
                host: urlObject.hostname,
                path: urlObject.pathname
            }, function(req_headers) {
                var contentType = req_headers.headers['content-type'];
                if (contentType.includes('html')) {
                    request(urlLink, function(err, response, body) {
                        if (err) {
                            res.status(500).send(err.message);
                        } else {
                            var rebuilt = '';
                            var targets = ['href=', 'src='];
                            for (var i = 0; i < body.length; i++) {
                                var found = false;
                                for (var target in targets) {
                                    var j = i + target.length;
                                    if (j < body.length) {
                                        var prefix = body.substring(i, j);
                                        if (prefix === target) {
                                            found = true;
                                            var quote_start = -1;
                                            var quote_end = -1;
                                            for (var c = j; c < body.length; c++) {
                                                if (body[c] === '"') {
                                                    if (quote_start === -1) {
                                                        quote_start = c;
                                                    }
                                                    else if (quote_end === -1) {
                                                        quote_end = c;
                                                        break;
                                                    }
                                                }
                                            }
                                            // console.log(body.substring(quote_start, quote_end));
                                            console.log(i+" "+quote_end);
                                        }
                                    }
                                }
                                if (!found) {
                                    rebuilt += body[i];
                                }
                            }
                            res.status(200).send(rebuilt);
                        }
                    });
                } else {
                    res.set(req_headers.headers);
                    request(urlLink).pipe(res);
                }
            }).end();
        } else {
            res.status(200).render('index');
        }
    });
});

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}
