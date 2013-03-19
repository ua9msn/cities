/**
 * Author : Serge Balykov (ua9msn)
 * Date: 15.03.13
 * Time: 18:45
 *
 * Simple application to demonstrate my weak knowledge of node.js
 * I decide not to use Express in this application and decide to use Jade.
 * Why? Express becomes very popular deservedly but node != express.
 * At other side convenience('Jade') > convenience('plain HTML')
 *
 *
 */

var sys = require('sys'),
    http = require('http'),
    sio = require('socket.io'),
    url = require('url'),
    fs = require('fs'),
    path = require('path'),
    jade = require('jade');




var mimeTypes = {
    '.js' : 'text/javascript',
    '.css': 'text/css'
};

var app = http.createServer(function (req, res) {

    var url_parts = url.parse(req.url);

    //if file extension exists - it is a real file
    var ext = path.extname(url_parts.path);
    if (mimeTypes[ext]) {
        fs.exists('.' + url_parts.path, function (exist) {
            if (exist) {

                fs.readFile('.' + url_parts.path, function (err, data) {
                    if (err) {
                        res.writeHead(500);
                        res.end('Server Error!');
                        return;
                    }

                    var headers = {'Content-type': mimeTypes[ext], 'Content-length': data.length };
                    res.writeHead(200, headers);
                    res.end(data);
                    return;
                });
            }
        });
    } else {

        // Router, simple and supid
        switch (url_parts.pathname) {
            case '/':
                route_Home(url_parts.pathname, req, res);
                break;

            default:
                route_404(url_parts.pathname, req, res);
        }
        return;

    }


    // Next time i will use modules for this two functions.
    function route_Home(url, req, res) {
        jade.renderFile('./view/index.jade', function (err, html) {
            if (err) throw err;
            res.end(html);
        });
    }

    function route_404(url, req, res) {
        res.writeHead(404, {'Content-Type': 'text/html'});
        res.end(" <h1> 404  Not Found </h1> ");
    }

}).listen(8000);

var io = sio.listen(app, {
    'log level' : 1
});

// Core
var Game = require('./modules/game'),
    game = new Game(io),
    gamers = 0;

io.sockets.on('connection', function (socket) {

    game.gamerEnter(socket);

    socket.on('start', function (data) {
        game.start(socket);
    });

    socket.on('disconnect', function(){
       game.gamerExit(socket);
    });

    socket.on('hod', function(data){
       game.makeHod(socket, data);
    });
});



sys.puts('Server running at http://127.0.0.1:8000/');
