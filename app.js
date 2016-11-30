var express = require('express');
var urlExists = require('url-exists');
var request = require('request');

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
            var urlLink = urlObject.protocol + (urlObject.slashes ? '//' : '') + urlObject.hostname + (urlObject.hostname[urlObject.hostname.length - 1] === '/' ? '' : '/') + urlObject.pathname;
            request(urlLink, function(err, response, body) {
                if (err) {
                    res.status(500).send(err.message);
                } else {
                    var contentType = response.headers['content-type'];
                    if (contentType === undefined) {
                        console.log(response.headers);
                        console.log(urlLink);
                        console.log(urlObject.hostname);
                        console.log(urlObject.pathname);
                    }
                    if (contentType.includes('html')) {
                        var rebuilt = '';
                        var targets = ['href=', 'src='];
                        for (var i = 0; i < body.length; i++) {
                            var found = false;
                            for (var index in targets) {
                                var target = targets[index];
                                if (found) {
                                    break;
                                }
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
                                                } else if (quote_end === -1) {
                                                    quote_end = c;
                                                    break;
                                                }
                                            }
                                        }
                                        var inlinedUrl = body.substring(quote_start + 1, quote_end);
                                        if (inlinedUrl[0] === '#') {
                                            rebuilt += prefix + '"' + inlinedUrl + '"';
                                            i = quote_end + 1;
                                            continue;
                                        } else if (inlinedUrl[0] === '/') {
                                            inlinedUrl = urlObject.protocol + (urlObject.slashes ? '//' : '') + urlObject.hostname + inlinedUrl;
                                        }
                                        var inlinedUrlB64 = new Buffer(inlinedUrl).toString('base64');
                                        rebuilt += prefix + '"http://dmhacker-proxy.herokuapp.com/site/' + inlinedUrlB64 + '"';
                                        i = quote_end + 1;
                                    }
                                }
                            }
                            if (!found) {
                                rebuilt += body[i];
                            }
                        }
                        res.status(200).send(rebuilt);
                    } else {
                        res.set(response.headers);
                        request(urlLink).pipe(res);
                    }
                }
            });
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
