// Dependencies
var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');
var app = express();
var server = http.Server(app);
var io = socketIO(server);
var pport = process.env.PORT || 3000;
app.set('port', pport);
app.use('/static', express.static(__dirname + '/static'));
// Routing
app.get('/', function(request, response) {
  response.sendFile(path.join(__dirname, 'index.html'));
});

// STARTS THE SERVER
server.listen(pport, function() {
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
      for(var id in room.players){
        room.players[id].ready = false;
      }
      io.sockets.in(connected[socket.id].room.rmnm).emit('player change',connected[socket.id].room);
    }
  });
  // GAME INPUT
  socket.on('input',function(mouse){
    var client = connected[socket.id];
    // IF CLIENT IS IN A ROOM IN A GAME
    if(client.room && client.room.game && client.room.game.state === states.waiting){
      if(client.room.game.objects[socket.id]){
        var player = connected[socket.id].room.game.objects[socket.id]
        player.dx = -(player.x - mouse.x);
        player.dy = -(player.y - mouse.y);
        var angle = Math.atan2(player.dy, player.dx);
        if(Math.sqrt(player.dy*player.dy + player.dx*player.dx) > player.max){
          player.dx = Math.cos(angle)*player.max;
          player.dy = Math.sin(angle)*player.max;
        }
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
  menu: 'menu',
  showing: 'showing',
  playing: 'playing',
  waiting: 'waiting',
  end: 'end',
  dead: 'dead',
}
Object.freeze(states);

// ROOM OBJECT
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
    this.numplayers = Object.keys(players).length;

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

    for(var id in players){
      this.objects[id] = new player(0,0, players[id].name, this.rmnm, id);
    }
    this.spawnPlayers();

    io.sockets.in(rmnm).emit('game state', this.objects, this.state);
  }
  // CHECK IF GAME IS DONE
  checkEnd(){
    // ONE PLAYER LEFT || 0 PLAYERS LEFT
    if(Object.keys(this.objects).length <= 3){
      this.state = states.end;
      this.objects['broadcast'].msg = this.msgEnd();
      this.time = 4;
    }
  }
  // END GAME MESSAGE
  msgEnd(){
    if(Object.keys(this.objects).length == 3){
      var winnerid = 0;
      for(var id in this.objects){
        if(id != 'broadcast' && id != 'platform'){
          winnerid = id
        }
      }
      return (this.objects[winnerid].name+' has won!');
    }
    // TIE
    if(Object.keys(this.objects).length == 2){
      return 'It\'s a tie!';
    }
  }

  // EVERY STEP IN GAME
  gameStep(n){
    // IF ROOM DOESNT EXIST, STOP INTERVAL
    if(typeof rooms[this.rmnm] != 'undefined'){
      switch(this.state){

        /////// WAITING PHRASE
        case states.waiting:
          this.time -= (1/60);
          this.objects['broadcast'].msg = Math.floor(this.time);
          if(Math.floor(this.time) === -1){
            this.state = states.showing;
            this.objects['broadcast'].msg = '';
          }
          break;

        /////// SHOWING PHRASE PHRASE
        case states.showing:
          this.time -= (2/60);
          // WAITING . . . EFFECT
          switch(Math.floor(this.time)){
            case -4:
            this.time = 0;
            this.state = states.playing;

            break;
          }

          break;

        /////// PLAYING PHRASE ( PHYSICS AND COLLISIONS )
        case states.playing:
          this.time -= (3/60);
          switch(Math.floor(this.time)){
            case -1:
            this.objects['broadcast'].msg = 'waiting';
            break;
            case -2:
            this.objects['broadcast'].msg = 'waiting.';
            break;
            case -3:
            this.objects['broadcast'].msg = 'waiting..';
            break;
            case -4:
            this.objects['broadcast'].msg = 'waiting...';
            break;
            case -5:
            this.time = 0;
            break;
          }

          // PHYSICS LOGIC
          for(var id in this.objects){ // RESETS COLLISION TAG OF ALL PLAYERS
            if(this.objects[id].type === 'player'){
              this.objects[id].collide = false;
              // IF PLAYER IS OUTSIDE OF BOUNDS,
              if(this.objects[id].dead === true){
                this.objects[id].shrink();
              }
            }
          }

          for(var id in this.objects){ // RUN COLLISIONS
            if(this.objects[id].type === 'player'){
              var player = this.objects[id];
              for(var id2 in this.objects){ // ITERATES THROUGH ALL OTHER OBJECTS
                if(id != id2){
                  var other = this.objects[id2];
                  if(player.checkCollide(other)){
                    player.bounce(other);
                  }
                }
              }
            }
          }

          for(var id in this.objects){ // MOVE PLAYER
            if(this.objects[id].type === 'player'){
              for (var cols in this.objects[id].collided)
                {delete this.objects[id].collided[cols]};
              this.objects[id].move();
              this.objects[id].checkOnScreen(this.objects['platform'].radius);
            }
          }

          // CHECK IF ANYONE STILL MOVING
          var movement = false; // FLAG FOR MOVEMENT
          for(var id in this.objects){
            var player = this.objects[id];
            if(player.type === 'player'){
              if(player.dx != 0 || player.dy != 0 || player.dead === true){
                movement = true;
              }
            }
          }

          if(movement === false){
            this.time = 0;
            this.state = states.shrinking;
            this.objects['broadcast'].msg = '';
            this.checkEnd();
          }
          break;
        /////// SHRINK ISLAND
        case states.shrinking:

          this.time -= (2/60);
          if(Math.floor(this.time<-5)){
            // CHECK IF ANYONE STILL MOVING
            var movement = false; // FLAG FOR MOVEMENT
            for(var id in this.objects){
              var player = this.objects[id];
              if(player.type === 'player'){
                if(player.dx != 0 || player.dy != 0 || player.dead === true){
                  movement = true;
                }
              }
            }

            if(movement === false){
              this.state = states.waiting;
              this.time = 10;
              this.checkEnd();
              break;
            }
          }
          switch(Math.floor(this.time)){

          }
          this.objects['platform'].radius > 120 ?
            this.objects['platform'].radius *= 0.999 :
            this.objects['platform'].radius *= 0.996;

          for(var id in this.objects){ // ON SCREEN CHECK FOR EACH PLAYER
            if(this.objects[id].type === 'player'){
              this.objects[id].checkOnScreen(this.objects['platform'].radius);
              // SHRINKS IF DEAD
              if(this.objects[id].dead === true){
                this.objects[id].shrink();
              }
            }
          }

          break;

        // END GAME SCENERIO
        case states.end:
          this.time -= (1/60);
          if(Math.floor(this.time)<=0){
            this.state = states.dead;
          }
          break;
          // DEAD GAME
        case states.dead:
          io.sockets.in(this.rmnm).emit('game done');
          clearInterval(n);
          rooms[this.rmnm].states = states.waiting;
          delete rooms[this.rmnm].game;
          break;
      }
      io.sockets.in(this.rmnm).emit('game state', this.objects, this.state)
    } else {clearInterval(n);}
  }

  spawnPlayers(){
    var n = 0;
    for(var id in this.objects){
      var object = this.objects[id];
      if(object.type === 'player'){
        var angle = (2*Math.PI*n/this.numplayers)
        object.x = this.radius*0.8*Math.sin(angle);
        object.y = this.radius*0.8*Math.cos(angle);
        n+=1;
      }
    }
  }
}

// PLAYER OBJECT
class player{
  constructor(x, y, name, rmnm, id){
    // PROPERTIES
    this.type = 'player';
    this.rmnm = rmnm;
    this.id = id;
    this.x = x;
    this.y = y;
    this.dx = 0;
    this.dy = 0;
    this.max = 400;
    this.name = name;
    this.color = Rcolor();
    this.radius = 15;
    this.dead = false;
    // COLLIDED FLAG
    this.collided = {};
    this.collide = false;
  }

  move(){
    // MOVE BASED ON SPEED
    this.x += this.dx/(4*1000/60);
    this.y += this.dy/(4*1000/60);
    // DECELERATE
    this.dx *= 0.985;
    this.dy *= 0.985;
    // STOP MOVEMENT IF SLOW
    if(Math.sqrt(this.dx*this.dx + this.dy*this.dy)< 0.5){
      this.dx = 0;
      this.dy = 0;
    }
  }

  shrink(){
    var shrink = 2/3
    this.radius -= shrink
    if(this.radius - shrink < 0){
      this.destroy()
    }
  }

  checkCollide(other){
    if(this.collided.hasOwnProperty(other.id))
    {return false;}

    // DIFFERENCES IN X AND Y COORDINATES
    var xx = (this.x + this.dx/(4*1000/60)) - (other.x + other.dx/(4*1000/60))
    var yy = (this.y + this.dy/(4*1000/60)) - (other.y + other.dy/(4*1000/60))
    // TOTAL DIFFERENCE IN DISTANCE
    var dif = Math.sqrt(xx*xx + yy*yy);
    if(dif < this.radius + other.radius){ // 20 is radius of one ball
      // ADD OTHER'S ID INTO COLLIDED LIST
      this.collided[other.id] = new Object();
      other.collided[this.id] = new Object();
      return true;
    } else {
      return false;
    }
  }

  checkOnScreen(radius){

    var xx = (this.x + this.dx/(4*1000/60))
    var yy = (this.y + this.dy/(4*1000/60))
    var dif = Math.sqrt(xx*xx + yy*yy)

    // IF PLAYER'S CENTER POINT OS OUTSIDE OF ICEBERG
    if( dif > radius){
      this.dead = true;
    }
  }

  bounceOld(other){
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
  bounce(other){
    var angle1 = Math.atan2(other.y - this.y , other.x - this.x );
    let vx1 = this.dx * Math.cos(angle1) + this.dy * Math.sin(angle1);
    let vy1 = this.dx * -1 * Math.sin(angle1) + this.dy * Math.cos(angle1);

    let vx2 = other.dx * Math.cos(angle1) + other.dy * Math.sin(angle1);
    let vy2 = other.dx * -1 * Math.sin(angle1) + other.dy * Math.cos(angle1);

    // SWITCH X VELOCITIES
    let vx1f = vx2;
    let vx2f = vx1;

    // GIVE BACK VELOCITIES
    this.dx = vx1f*Math.cos(-angle1) + vy1*Math.sin(-angle1);
    this.dy = vx1f* -1 * Math.sin(-angle1) + vy1 * Math.cos(-angle1);

    other.dx = vx2f*Math.cos(-angle1) + vy2*Math.sin(-angle1);
    other.dy = vx2f* -1 * Math.sin(-angle1) + vy2 * Math.cos(-angle1);

    this.collide = true;
    other.collide = true;
  }
  destroy(){
    delete rooms[this.rmnm].game.objects[this.id];
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
