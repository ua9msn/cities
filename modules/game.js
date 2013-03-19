/**
 * Author : Serge Balykov (ua9msn)
 * Date: 18.03.13
 * Time: 0:16
 *
 */


var geode = require('geode');

var Game = function(io){

    // Required for true broadcast messaging
    this.io = io;

    this.gamers = [];

    this.state = {
        playerA     : '',
        playerB     : '',
        hod         : 'playerA',
        started     : false
    };

    this.cities = [];

    this.timer = null;

    this.geo = new geode('ua9msn', {language: 'en', country : 'US'});
};

Game.prototype = {

    start: function(socket){
        // If started do nothing
        if(this.state.started) return;

        // Fill players
        this.state.playerA = this.state.playerA || socket.id;

        // It is a stupid to play with yourself
        if(this.state.playerA != socket.id) {
            this.state.playerB = this.state.playerB || socket.id;
        }

        // As soon as both player press start
        if(this.state.playerA && this.state.playerB) {
            this.state.started = true;
        }

        this.io.sockets.emit('gamestate' , { state: this.state });
    },

    // Reset the game
    reset: function(socket){
        this.state.playerA = '';
        this.state.playerB = '';
        this.state.hod = 'playerA';
        this.state.started = false;
        this.cities.length = 0;

        this.io.sockets.emit('gamestate', { state : this.state });

    },

    gamerEnter: function(socket){
        this.gamers.push(socket.id);
        socket.emit('connected',  {'id': socket.id, gamers: this.gamers} );
        socket.emit('gamestate',  {'state': this.state } );
        socket.broadcast.emit('gamer', {'id' : socket.id , 'state': 'connected'});

    },

    gamerExit: function(socket){
        var i = this.gamers.indexOf(socket.id);
        this.gamers.splice(i,1);

        // Gamer gone
        socket.broadcast.emit('gamer', {'id' : socket.id , 'state' : 'disconnected'});

        // Player gone
        if(this.state.playerA == socket.id || this.state.playerB == socket.id) {
            this.reset(socket);
        }
    },

    makeHod: function(socket, data){
        // If it is not your turn just return
        if(socket.id != this.state[this.state.hod]) return;

        var self = this, // Bad style, but two nested callbacks...  For now it simplier .
            lastLetter,
            result = {
                city: data.city,
                clss: 'valid',
                info: 'Ok',
                geo : {}
            };

        // If it is the first turn make first city valid
        if(!this.cities.length){
            this.cities.push(data.city.substr(0,1).toLowerCase());
        }

        lastLetter = this.cities.slice(-1)[0].substr(-1).toLowerCase();

        if( lastLetter != data.city.substr(0,1).toLowerCase() ){
            result.clss = 'notvalid';
            result.info = 'You have to answer beginning with ' + lastLetter;
            send();
            return;
        }
        if(!!~this.cities.indexOf( data.city.toLowerCase() ) ){
            result.clss = 'notvalid';
            result.info = 'This city had been mentioned already!';
            send();
            return;
        }

        this.geo.search({name_equals : data.city, country: 'US'}, function(err, results){
            if(results.totalResultsCount == 0){
                result.clss = 'notvalid';
                result.info = 'No such city!';
            }  else {
                result.geo = results;
            }

            send();
            return;
        });

        function send(){
            if(result.clss == 'valid'){

                self.cities.push(data.city.toLowerCase());

                // Turn to another player
                self.state.hod = self.state.hod == 'playerA' ? 'playerB' : 'playerA';

                clearTimeout(self.timer);

                self.timer = setTimeout(self.finishGame, 20000, self.state.hod, socket, self );
            }

            self.io.sockets.emit('hodresult', result);
            self.io.sockets.emit('gamestate' , { state: self.state });
        }

    },

    finishGame: function(player, socket, that){
        that.io.sockets.emit('finish', {looser: player});
        that.reset(socket);
    }

}

module.exports = Game;
