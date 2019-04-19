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
    console.log('ready!')
    // SETS THE PLAYER'S STATUS TO READY
    connected[socket.id].room.players[socket.id].ready ?
      connected[socket.id].room.players[socket.id].ready = false :
      connected[socket.id].room.players[socket.id].ready = true;
    // UPDATES ALL PLAYERS
    io.sockets.in(connected[socket.id].room.rmnm).emit('player change',connected[socket.id].room);
    // CHECK IF ALL PLAYERS ARE READY HERE
  });
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
    this.state = undefined; // MENU, SETUP, PLAYING, WAITING

    return this;
  }
  // DELETING THE ROOM
  checkEmpty(){
    if(Object.keys(this.players).length === 0){
      delete rooms[this.rmnm];
    }
  }
}
