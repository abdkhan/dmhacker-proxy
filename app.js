var express = require('express');
var urlExists = require('url-exists');
var request = require('request');
var http = require('http');
var httpHeaders = require('http-headers');
var fs = require('fs');

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
            var urlHost = urlObject.protocol + (urlObject.slashes ? '//' : '') + urlObject.host;
            http.request({
                method: 'HEAD',
                host: urlObject.hostname,
                path: urlObject.pathname
            }, function (req_headers) {
                var contentType = req_headers.headers['content-type'];
                if (contentType.includes('html')) {
                    request(urlHost, function(err, response, body) {
                        if (err) {
                            res.status(500).send(err.message);
                        } else {
                            var targets = {
                                '<link': 'href',
                                '<script': 'src'
                            };
                            for (var i = 0; i < body.length - 7; i++) {
                                for (var target in targets) {
                                    var start = i + target.length;
                                    var prefix = body.substring(i, start);
                                    if (prefix === target) {
                                        var infix = '';
                                        for (var j = start; j < body.length; j++) {
                                            var c = body[j];
                                            if (c === '>') {
                                                break;
                                            } else {
                                                infix += c;
                                            }
                                        }
                                        console.log(infix);
                                    }
                                }
                            }
                            res.status(200).send(body);
                        }
                    });
                }
                else {
                    res.setHeader('Content-type', contentType);
                    http.get(urlHost, function(res_file) {
                        console.log(res_file);
                        res_file.pipe(res);
                    });
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
