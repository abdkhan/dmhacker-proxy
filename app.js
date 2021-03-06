var express = require('express');
var request = require('request');
var cheerio = require('cheerio');
var css = require('css');

var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
    response.render('index');
});

app.get('/ip', function (req, res) {
    require('public-ip').v4().then(function (address) {
        res.status(200).json({
            ip: address
        });
    });
});

// Where the magic happens
app.get('/site/*', function(req, res) {
    var urlLink = req.originalUrl.substring('/site/'.length);

    // Format provided URL
    if (!urlLink.startsWith('http://') && !urlLink.startsWith('https://')) {
        if (urlLink.startsWith('//')) {
            urlLink = 'http://' + urlLink.substring(2);
        }
        else {
            urlLink = 'http://' + urlLink;
        }
    }

    // Special cases
    urlLink = urlLink.split('http://wikipedia.org').join('http://en.wikipedia.org');
    urlLink = urlLink.split('https://wikipedia.org').join('https://en.wikipedia.org');

    var urlObject = require('url').parse(urlLink);
    var urlHost = urlObject.protocol + (urlObject.slashes ? '//' : '') + urlObject.hostname;
    request({
        url: urlLink,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36'
        }
    }, function(err, response, body) {

        var transformLink = function(old_attr) {
            old_attr = old_attr === undefined ? undefined : old_attr.trim();
            if (old_attr === undefined || old_attr[0] === '#') {
                return old_attr;
            }
            else if (old_attr[0] === '/') {
                if (old_attr[1] === '/') {
                    old_attr = 'http:' + old_attr;
                }
                else {
                    old_attr = urlHost + old_attr;
                }
            }
            else if (old_attr.substring(0, 4) !== 'http') {
                // We don't know what this is ... could be a link missing the http OR a call to the current directory
                // Nevertheless, we make our best guess
                var first_part = old_attr.split('/')[0];
                if (first_part.includes('.com') || first_part.includes('.org') || first_part.includes('.net') || first_part.includes('.edu')) {
                    old_attr = urlObject.protocol + (urlObject.slashes ? '//' : '') + old_attr;
                }
                else {
                    old_attr = urlLink + '/' + old_attr;
                }
            }

            function isURL(str) {
                var urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
                var url = new RegExp(urlRegex, 'i');
                return str.length < 2083 && url.test(str);
            }

            // If not a url, do last minute fixes
            if (!isURL(old_attr)) {
                old_attr = urlHost + ((urlHost[urlHost.length - 1] === '/' || old_attr[0] === '/') ? '' : '/') + old_attr;
            }

            return 'http://dmhacker-proxy.herokuapp.com/site/' + old_attr;
        };

        if (err) {
            res.status(400).send(err.message);
        } else {
            var contentType = response.headers['content-type'];
            if (contentType !== undefined && contentType.includes('html')) {
                var $ = cheerio.load(body);
                var targets = [
                    ['link', 'href'],
                    ['a', 'href'],
                    ['a', 'data-href-url'],
                    ['script', 'src'],
                    ['img', 'src'],
                    ['img', 'srcset'],
                    ['form', 'action'] // Easy way of modifying forms; only works for search forms (not login, etc.)
                ];

                for (var t in targets) {
                    var target = targets[t];
                    $(target[0]).each(function () {
                        var old_attr = $(this).attr(target[1]);
                        if (old_attr === undefined) {
                            return;
                        }
                        if (target[1] === 'srcset') {
                            var eachLink = old_attr.split(',');
                            var doctoredLinks = [];
                            for (var i in eachLink) {
                                var trimmed = eachLink[i].trim();
                                var sublinks = trimmed.split(' ');
                                sublinks[0] = transformLink(sublinks[0]);
                                doctoredLinks.push(sublinks.join(' '));
                            }
                            $(this).attr(target[1], doctoredLinks.join(', '));
                            return;
                        }
                        var new_attr = transformLink(old_attr);
                        $(this).attr(target[1], new_attr);
                        $(this).attr('integrity', '');
                    });
                }

                res.status(200).send($.html());
            /*
            } else if (contentType !== undefined && contentType.includes('css')) {
                res.setHeader('Content-type', 'text/css');

                var ast = css.parse(body, {
                    silent: false
                });

                var isObject = function(a) {
                    return (!!a) && (a.constructor === Object);
                };

                var recurse = function (level) {
                    for (var k in level) {
                        if (Array.isArray(level) || level.hasOwnProperty(k)) {
                            var v = level[k];
                            if (Array.isArray(v) || isObject(v)) {
                                recurse(v);
                            }
                            else if (typeof v === 'string') {
                                if (v.trim().startsWith('url(')) {
                                    var start = v.indexOf('url(');
                                    if (start !== -1) {
                                        var end = start;
                                        for (; end < v.length; end++) {
                                            if (v[end] === ')')
                                                break;
                                        }
                                        // Content inside the url(...)
                                        var extracted = v.substring(start + 'url('.length, end);
                                        var quotes = '';
                                        if (extracted[0] === '"' || extracted[0] === "'") {
                                            quotes = extracted[0];
                                            extracted = extracted.substring(1, extracted.length - 1);
                                        }
                                        if (!extracted.startsWith('data:')) {
                                            level[k] = v.substring(0, start) + 'url(' + quotes + transformLink(extracted) + quotes + ')' + v.substring(end + 1);
                                        }
                                    }
                                }
                            }
                        }
                    }
                };

                recurse(ast);

                res.status(200).send(css.stringify(ast));
            */
            } else {
                res.set(response.headers);
                request({
                    url: urlLink,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36'
                    }
                }).pipe(res);
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
