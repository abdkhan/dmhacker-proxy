var express = require('express');
var request = require('request');
var cheerio = require('cheerio');

var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
    response.render('index');
});

// Where the magic happens
app.get('/site/:b64url', function(req, res) {
    var urlLink = new Buffer(req.params.b64url, 'base64').toString('ascii');
    if (!urlLink.startsWith('http://') && !urlLink.startsWith('https://')) {
        urlLink = 'http://' + urlLink;
    }
    var urlObject = require('url').parse(urlLink);
    request(urlLink, function(err, response, body) {
        if (err) {
            res.status(400).send(err.message);
        } else {
            var contentType = response.headers['content-type'];
            if (contentType.includes('html')) {
                var $ = cheerio.load(body);
                var targets = [['link', 'href'], ['a', 'href'], ['script', 'src'], ['img', 'src']];
                for (var t in targets) {
                    var target = targets[t];
                    $(target[0]).each(function () {
                        var old_attr = $(this).attr(target[1]);
                        if (old_attr === undefined || old_attr[0] === '#') {
                            return;
                        }
                        else if (old_attr[0] === '/') {
                            old_attr = urlObject.protocol + (urlObject.slashes ? '//' : '') + urlObject.hostname + (old_attr[0] === '/' ? '' : '/') + old_attr;
                        }
                        else if (old_attr.substring(0, 4) !== 'http') {
                            // We don't know what this is ... could be a link missing the http OR a call to the current directory
                            // Nevertheless, we make our best guess
                            var first_part = old_attr.split('/')[0];
                            if (old_attr.substring(0, 2) === '//' || first_part.includes('.com') || first_part.includes('.org') || first_part.includes('.net') || first_part.includes('.edu')) {
                                old_attr = urlObject.protocol + (urlObject.slashes ? '//' : '') + old_attr;
                            }
                            else {
                                old_attr = urlLink + '/' + old_attr;
                            }
                        }
                        var old_b64 = new Buffer(old_attr).toString('base64');
                        $(this).attr(target[1], 'http://dmhacker-proxy.herokuapp.com/site/' + old_b64);
                    });
                }
                res.status(200).send($.html());
            } else {
                res.set(response.headers);
                request(urlLink).pipe(res);
            }
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
