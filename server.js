// Dependencies
var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');
var app = express();
var server = http.Server(app);
var io = socketIO(server);
app.set('port', 5000);
app.use('/static', express.static(__dirname + '/static'));
// Routing
app.get('/', function(request, response) {
  response.sendFile(path.join(__dirname, 'index.html'));
});

// STARTS THE SERVER
server.listen(5000, function() {
  console.log('Starting server on port 5000');
});

////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////
setInterval(function(){
  console.table(rooms);
},1000);
var connected = {};

// SOCKET HANDLERS
io.on('connection', function(socket) {
  // WHEN PLAYER CONNECTS
  connected[socket.id] = {
    room: undefined,
  };

  // WHEN PLAYER CREATES ROOM
  socket.on('create room', function(name){
    // SET CONNECTED PLAYER'S ROOM TO NEW ROOM OBJECT
    connected[socket.id].room = new room();
    // CREATE AN ENTRY IN THE ROOM FOR SAID PLAYER
    connected[socket.id].room.players[socket.id] = new Object();
    connected[socket.id].room.players[socket.id].id = socket.id;
    connected[socket.id].room.players[socket.id].name = name;
    connected[socket.id].room.players[socket.id].ready= false;
    // RMNM IS ID OF ROOM
    var rmnm = connected[socket.id].room.rmnm;
    socket.join(rmnm);

    // UPDATES ALL PLAYERS INSIDE THE ROOM OF A PLAYER CHANGE
    io.sockets.in(rmnm).emit('player change',connected[socket.id].room);
  })

  // WHEN A PLAYER LEAVES ROOM
  socket.on('leave room',function(){
    // DISCONNECT FROM ROOM
    if(typeof connected[socket.id].room != 'undefined'){
      // DELETE SOCKET ID FROM LIST OF PLAYERS IN ROOM
      delete connected[socket.id].room.players[socket.id];
      // TELLS ALL PLAYERS THAT YOU LEFT
      io.sockets.in(connected[socket.id].room.rmnm).emit('player change',connected[socket.id].room);
      // CHECK IF ROOM IS EMPTY
      connected[socket.id].room.checkEmpty();
    }
    connected[socket.id].room = undefined;
  })

  // WHEN PLAYER JOINS ROOM ( takes id of room as parametr )
  socket.on('join room', function(rmnm, name){
    console.log(name);
    // EMPTY VARIABLE
    var response = "";
    // IF ROOM EXISTS
    if(typeof rooms[rmnm] != 'undefined'){
      // IF ROOM IS NOT FULL
      if(Object.keys(rooms[rmnm].players).length != 8){
        // SET CONNECTED PLAYER'S CONNECTED ROOM TO SPECIFIC ROOM
        connected[socket.id].room = rooms[rmnm];
        // ADDS ENTRY FOR SAID PLAYER
        connected[socket.id].room.players[socket.id] = new Object();
        connected[socket.id].room.players[socket.id].id = socket.id;
        connected[socket.id].room.players[socket.id].name = name;
        connected[socket.id].room.players[socket.id].ready= false;
        // JOINS
        socket.join(rmnm);

        response = 'Room joined!';

        io.sockets.in(rmnm).emit('player change',connected[socket.id].room);
      } else {
        response = 'Room full!';
      }
    } else { response = 'Room does not exist!'; }
    io.to(socket.id).emit('join msg', response);
  })
  // WHEN A PLAYER TOGGLES READY
  socket.on('toggle ready',function(){
    // START GAME FUNCTION
    var room = connected[socket.id].room;
    // SETS THE PLAYER'S STATUS TO READY
    room.players[socket.id].ready ?
      room.players[socket.id].ready = false :
      room.players[socket.id].ready = true;
    // UPDATES ALL PLAYERS
    io.sockets.in(connected[socket.id].room.rmnm).emit('player change',connected[socket.id].room);

    // CHECK IF ALL PLAYERS ARE READY
    var numplayers = Object.keys(room.players).length;
    for(var id in room.players){
      if(room.players[id].ready === true)
      {numplayers -=1;}
    }
    if(numplayers === 0){// IF ALL PLAYERS ARE READY
      // START GAME IF ALL PLAYERS ARE READY
      room.game = new game(room.rmnm, room.players);
      room.state = states.playing;
    }
  });
  // GAME INPUT
  socket.on('input',function(mouse){
    var client = connected[socket.id];
    // IF CLIENT IS IN A ROOM IN A GAME
    if(client.room && client.room.game && client.room.game.state === states.waiting){
      var player = connected[socket.id].room.game.objects[socket.id]
      player.dx = -(player.x - mouse.x);
      player.dy = -(player.y - mouse.y);
      var angle = Math.atan2(player.dy, player.dx);
      if(Math.sqrt(player.dy*player.dy + player.dx*player.dx) > player.max){
        player.dx = Math.cos(angle)*player.max;
        player.dy = Math.sin(angle)*player.max;
      }

    }
  })
  // WHEN PLAYER DISCONNECT
  socket.on('disconnect',function(){
    // CHECK IS CONNETCED CLIENT HAS A ROOM
    if(typeof connected[socket.id].room != 'undefined'){
      // DELETE SOCKET ID FROM LIST OF PLAYERS IN ROOM
      delete connected[socket.id].room.players[socket.id];
      // TELLS ALL PLAYERS THAT YOU LEFT
      io.sockets.in(connected[socket.id].room.rmnm).emit('player change',connected[socket.id].room);
      // CHECK IF ROOM IS EMPTY
      connected[socket.id].room.checkEmpty();
    }
    // DELETE SOCKET FROM LIST OF CONNETED CLIENTS
    delete connected[socket.id]
  })
});

// LIST OF ROOMS
var rooms = {};
// ROOMS OBJECT
var states = {
  menu: 0,
  playing: 1,
  waiting: 2
}
Object.freeze(states);
class room{
  // CREATING THE ROOM
  constructor(){
    // MAKES RANDOM ID ( returns 4 digit string )
    function makeid() {
      var text = "";
      var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for (var i = 0; i < 4; i++)
      {text += possible.charAt(Math.floor(Math.random() * possible.length))};
      return text;
    }
    while(true){
      var id = makeid();
      if(typeof rooms[id] === 'undefined'){
        this.rmnm = id;
        rooms[id] = this;
        break;
      }
    }

    this.players = {};
    this.type = undefined; // SOLO, PRIVATE, PUBLIC
    this.state = states.menu; // MENU, SETUP, PLAYING, WAITING

    return this;
  }
  // DELETING THE ROOM
  checkEmpty(){
    if(Object.keys(this.players).length === 0){
      delete rooms[this.rmnm];
    }
  }
}

// GAME OBJECT
class game{

  // ROOM PROPERTIES
  constructor(rmnm, players){
    this.radius = 250;
    this.time = 10;

    var n = setInterval(()=>{this.gameStep(n)},1000/60);

    this.rmnm = rmnm;
    this.state = states.waiting; // WAITING FOR INPUT
    this.objects = {};
    this.objects['platform'] = new Object();
    this.objects['platform'].type = 'game';
    this.objects['platform'].radius = this.radius;

    this.objects['broadcast'] = new Object();
    this.objects['broadcast'].type = 'game';
    this.objects['broadcast'].msg = '';

    var num = 1;
    for(var id in players){
      this.objects[id] = new player( 50 * num, 50 , players[id].name);
      num += 1;
    }

    io.sockets.in(rmnm).emit('game state', this.objects);
  }

  // EVERY STEP IN GAME
  gameStep(n){
    // IF ROOM DOESNT EXIST, STOP INTERVAL
    if(typeof rooms[this.rmnm] != 'undefined'){
      switch(this.state){
        case states.waiting:
        // GAME IS WAITNG FOR USER INPUTS
          break;
        case states.playing:
        // GAME DOES PHYSICS AND COLLISIONS
          break;
      }
      io.sockets.in(this.rmnm).emit('game state', this.objects);
    } else {clearInterval(n);}
  }

  spawnPlayers(){

  }

  stepPlayers(){

  }
}

// PLAYER OBJECT
class player{
  constructor(x, y, name){
    // PROPERTIES
    this.type = 'player';
    this.x = x;
    this.y = y;
    this.dx = 0;
    this.dy = 0;
    this.max = 400;
    this.name = name;
    this.color = Rcolor();
    // COLLIDED FLAG
    this.collide = false;
  }

  move(){
    // MOVE BASED ON SPEED
    this.x += dx;
    this.y += dy;
    // DECELERATE
    this.dx *= 0.9;
    this.dy *= 0.9;
  }

  checkCollide(other){
    // DIFFERENCES IN X AND Y COORDINATES
    var xx = (this.x + this.dx) - (other.x + other.dx)
    var yy = (this.y + this.dy) - (other.y + other.dy)
    // TOTAL DIFFERENCE IN DISTANCE
    var dif = Math.sqrt(xx*xx + yy*yy);
    if(dif < 40){ // 20 is radius of one ball
      return true;
    } else {
      return false;
    }
  }

  bounce(other){
    var xx = this.dx;
    var yy = this.dy;
    // OBJECT'S SPEED IS NOW THE OTHER'S
    this.dx = other.dx;
    this.dy = other.dy;
    this.collide = true;
    // OTHER'S SPEED IS NOW OBJECT'S
    other.dx = xx;
    other.dy = yy;
    this.collide = true;
  }
}

// RANDOM COLOR
function Rcolor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
