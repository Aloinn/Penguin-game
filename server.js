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

var connected = {};
// SOCKET HANDLERS
io.on('connection', function(socket) {
  // WHEN PLAYER CONNECTS
  connected[socket.id] = {
    room: undefined,
  };

  // WHEN PLAYER CREATES ROOM
  socket.on('create room', function(){
    connected[socket.id].room = new room();
    connected[socket.id].room.players[socket.id] = socket.id;
    console.table(rooms);
    console.table(connected);
  })

  // WHEN PLAYER JOINS ROOM ( takes id of room as parametr )
  socket.on('join room', function(id){
    // IF ROOM EXISTS
    if(typeof rooms[id] != undefined){
      // IF ROOM IS NOT FULL
      if(Object.keys(rooms[id].players).length != 10){
        // PLAYER'S ROOM PROPERTY IS NOW THE ROOM OBJECT
        connected[socket.id].room = rooms[id];
        rooms[id].players[socket.id] = socket.id;
        return('Room joined!');
      } else {
        return('Room full!');
      }
    } else { return('Room does not exist!'); }
  })

  // WHEN PLAYER DISCONNECT
  socket.on('disconnect',function(){
    // CHECK IS CONNETCED CLIENT HAS A ROOM
    if(typeof connected[socket.id].room != 'undefined'){
      console.log('room!');
      // DELETE SOCKET ID FROM LIST OF PLAYERS IN ROOM
      delete connected[socket.id].room.players[socket.id];
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
        rooms[id] = id;
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
