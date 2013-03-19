/**
 * Author : Serge Balykov (ua9msn)
 * Date: 15.03.13
 * Time: 23:45
 *
 */


var socket = io.connect('http://localhost:8000');

$(document).ready(function(){

    var gameState,
        yourID,
        timer;

    // Templates
    var gamerTPL = _.template(' \
    <li id="<%- id %>" >        \
       <%- id %>                \
    </li>      \ ');

    var gameStateTPL = _.template('                                      \
    <p>You are <%- youare %> </p>                                        \
    <p>player A : <%- playerA %></p>                                     \
    <p>player B : <%- playerB %></p>                                     \
    <p>Game  <% print(started ? "started " : "stopped ") %></p>          \
    <p>Now turn : <%- hod %></p>                                         \
                                                                         \
    ');


    var cityTPL = _.template('      \
        <li class="<%= clss %>" >   \
            <%= city %>             \
        </li>                       \
    ');

    var infoTPL = _.template('  \
        <p> <%= info %> </p>    \
        <% if(geo) { %>         \
        <p> Found: <%= geo.totalResultsCount %> </p>    \
        <% _.each(geo.geonames, function(geoname){ %>   \
            <p><% print( geoname.name +", "+ geoname.adminCode1) %></p>                              \
                                                        \
        <% }); } %>                                         \
       \
    ');

    // jQuery DOM objects cache
    var $gamersUL  = $('#gamers ul');
    var $playPanel = $('#playstate .panel');
    var $infoPanel = $('#info .panel');
    var $cityinput = $('#city input');
    var $playfield = $('#playfield');


    socket.on('gamestate', onGameState);
    socket.on('connected', onConnected);
    socket.on('gamer', onGamer);
    socket.on('hodresult', onHodResult);
    socket.on('finish', onFinish);


    $('#startplaybtn').click(function(){
        socket.emit('start');
    });

    $('#city').on('submit', function(e){
        e.preventDefault();
        var city = $cityinput.val();
        $cityinput.val('');

        if(gameState.started && yourID == gameState[gameState.hod]){
            socket.emit('hod', { 'city' : city });
        }
    });


    function onConnected(data){
        yourID = data.id;
        $('.js_you').html('You are '+ data.id);
        $gamersUL.empty();
        _.each(data.gamers, function(id){
            $gamersUL.append(gamerTPL( { id:id } ));
        });

        console.log(data);
    }

    function onGamer(data){

        switch (data.state) {
            case 'connected':
                $gamersUL.append(gamerTPL({id:data.id}));
                break;

            case 'disconnected' :
                $gamersUL.find('#'+ data.id).remove();
                break;

            default :
                break;
        }
        console.log(data);
    }

    function onGameState(data){
        gameState = data.state;

        gameState.youare = 'viewing this game';
        if(yourID == gameState.playerA) {
            gameState.youare = 'player A';
        } else
        if(yourID == gameState.playerB) {
            gameState.youare = 'player B';
        }

        if(!gameState.started){
            $playfield.empty();
            $('.bar').css('width', 0);

        }

        $playPanel.html(gameStateTPL(gameState));

        console.log(gameState);
    }

    function onHodResult(data){

        $playfield.append(cityTPL(data));
        $infoPanel.html(infoTPL(data));

        console.log('data:',  data);

        if(data.clss != 'valid') return;

        if(yourID == gameState[gameState.hod]) {
            $('.bar').removeClass('bar-warning');
        } else {
            $('.bar').addClass('bar-warning');
        }

        //Start timer
        clearInterval(timer);
        var percent = 0;

        timer = setInterval(function(){
            percent += 1;

            $('.bar').css('width', percent+'%');

            // One of players loose!
            if(percent >= 100) {
                clearInterval(timer);
            }
        },200);

    }

    function onFinish(data){
        console.log('FINISH! LOOSER IS', data.looser);

        data.info = 'Game over. ' + data.looser + ' looses. ';
        data.geo = false;

        $infoPanel.html(infoTPL(data));
    }




});

