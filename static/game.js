// CLIENTSIDE JAVASCRIPT
var socket = io();

// RECIEVE MESSAGES FROM SERVER
socket.on('message', function(data) {
  console.log(data);
});
// MENU SETUP
var menuMain = document.getElementById("main-menu");
var menuJoin = document.getElementById("join-menu");
var menuRoom = document.getElementById("room-menu");

function displaySection(display = false){
  menuMain.style.display = "none";
  menuJoin.style.display = "none";
  menuRoom.style.display = "none";

  if(display)
  {display.style.display = "flex";}
}

// CANVAS SETUP
var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");
var ratioX = 0;
var ratioY = 0;
var offsetX = 0;
var offsetY = 0;
var ratio = 0;
function canvasetup(){
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  offsetX = canvas.width/2;
  offsetY = canvas.height*5.5/10;
  ratioX = canvas.width/800;
  ratioY = canvas.height/600;
  ratio  = Math.min(ratioX,ratioY);
  ratio = Math.min(ratio,1.2)
}
window.addEventListener('resize',canvasetup);
canvasetup();

///////////////////////////////////////////////////////////
/////////////////// MENU BASED METHODS ////////////////////
///////////////////////////////////////////////////////////

// CLEAR FIELD
function clearfield(){
  this.value = "";
}
// CLEAR TEXTBOXES
function getName(){
  if(document.getElementById('name-input').value != 'Enter your NAME here')
  { return document.getElementById('name-input').value }
  else
  { return('Player'); }
}
// ON CONNECT
function createRoom(){
  socket.emit('create room', getName());
}
// ON JOIN
function joinRoom(){
  socket.emit('join room', document.getElementById('code-input').value, getName());
  socket.on('join msg', function(response){
    document.getElementById('code-input').value = response;
    if(response === 'Room joined!'){
      displaySection(menuRoom);
    }
  })
}
// ON READY
function toggleReady(){
  socket.emit('toggle ready');
}
// ON DISCONNECT
function disconnectRoom(){
  socket.emit('leave room');
}
// UPDATES ROOM LIST
socket.on('player change', function(room) {
  // CLEAR PLAYER LIST
  for(var i = 1; i < 9; i ++){
    var txtbox = document.getElementById("p"+i.toString());
    txtbox.style.backgroundImage = "none";
    txtbox.innerHTML = '_'
  }
  // DECLARE PLAYER LIST USING PLAYER LIST
  var i = 1;
  for(var id in room.players){
    var txtbox = document.getElementById("p"+i.toString());
    txtbox.innerHTML = room.players[id].name;
    room.players[id].ready ? txtbox.style.backgroundImage = "url('/static/checkmark.png')" : txtbox.style.backgroundImage = "none";
    i += 1;
  }
  document.getElementById('room-number').innerHTML = room.rmnm;
});

///////////////////////////////////////////////////////////
/////////////////// GAME BASED METHODS ////////////////////
///////////////////////////////////////////////////////////

// MOUSE INPUT
canvas.addEventListener("mousemove",  doMouseMove,  false);
canvas.addEventListener("mouseup",    doMouseUp,    false);

var mouse = {
  x: 0,
  y: 0,
}

function doMouseUp(event){
  socket.emit('input', mouse);
}

function doMouseMove(event){
  var rect = canvas.getBoundingClientRect();
  mouse.x = -offsetX + Math.round((event.clientX - rect.left) / (rect.right - rect.left) * canvas.width);
  mouse.y = -offsetY + Math.round((event.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height);
}

// DRAWING
function drawPlayer(object){
  // DRAW BODY
  if(object.type === 'player'){
    ctx.beginPath();
    ctx.arc(object.x + offsetX, object.y + offsetY, object.radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = object.color;
    ctx.fill();
    ctx.closePath();

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'black';
    ctx.stroke();

    // DRAW NAME
    ctx.fillStyle = 'black';
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(object.name, (object.x + offsetX), (object.y + offsetY)+ (30));
  }
}

// DRAW INFO IF OBJECT IS PLAYER'S
function drawInfo(object, radius){
  // DRAW TRAJECTORY
  var color = undefined;
  Math.sqrt(mouse.x*mouse.x + mouse.y*mouse.y) > radius ? color = 'rgba(145, 145, 145, 0.69)' : color = 'lightgray';
  arrow(color ,object.x + offsetX, object.y + offsetY, offsetX+ mouse.x, offsetY+mouse.y,
      Math.min((Math.sqrt(Math.pow(object.x - mouse.x,2)+Math.pow(object.y - mouse.y,2))/object.max),2))

  if(object.dx != 0 && object.dy != 0){
    arrow(object.color,object.x + offsetX, object.y + offsetY, object.x + offsetX + object.dx, object.y + offsetY + object.dy,
      Math.min((Math.sqrt(object.dx*object.dx+object.dy*object.dy)/object.max),1))
  }
}

socket.on('game state',function(objects, state){
  displaySection();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "lightgray";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // DRAW PLATFORM
  ctx.beginPath();
  ctx.arc(offsetX, offsetY, objects['platform'].radius , 0, 2 * Math.PI, false);
  ctx.fillStyle = '#efefef'
  ctx.fill();
  ctx.strokeStyle = 'gray'
  ctx.stroke();
  ctx.closePath();
  // DRAW ARROWS
  for(var id in objects){
    if( objects[id].type === 'player'){
      switch(state){
        case 'waiting':
          if( id === socket.id && state === 'waiting')
          { drawInfo(objects[id],objects['platform'].radius) }
        break;
        case 'showing':
          var object = objects[id];
          arrow(object.color,object.x + offsetX, object.y + offsetY, object.x + offsetX + object.dx, object.y + offsetY + object.dy,
          Math.min((Math.sqrt(object.dx*object.dx+object.dy*object.dy)/object.max),1))
        break;
      }
    }
  }
  // DRAW PLAYERS ON TOP OF ARROWS
  for(var id in objects){
    drawPlayer(objects[id])
  }

  // BROADCAST
  var txt = objects['broadcast'].msg;
  ctx.font = "bold 60px Arial";
  ctx.fillStyle = "#efefef";
  ctx.strokeStyle = 'black'
  ctx.fillText(txt,canvas.width/2,canvas.height/10)
  ctx.strokeText(txt,canvas.width/2, canvas.height/10);

  if(state === 'dead'){
    gameEnded();
  }
})

socket.on('game done',function(){
  gameEnded();
})

function gameEnded(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  displaySection(menuRoom);
}

// DRAW ARROW
function arrow(color, fromx, fromy, tox, toy, wwidth){

  var angle = Math.atan2(toy-fromy,tox-fromx);

  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  var dy = toy-fromy;
  var dx = tox-fromx;

  var width = 10*(1+(1.1*wwidth));
  var headlen = width;   // length of head in pixels
  // DRAW LINE
  ctx.beginPath();
  ctx.moveTo(fromx,fromy);
  ctx.lineTo(tox-headlen*Math.cos(angle),toy-headlen*Math.sin(angle));
  ctx.lineWidth = width
  ctx.stroke();

  // DRAW HEAD
  ctx.beginPath();
  ctx.lineWidth = 5;
  ctx.moveTo(tox, toy);
  ctx.lineTo(tox-headlen*Math.cos(angle-Math.PI/6),toy-headlen*Math.sin(angle-Math.PI/6));
  ctx.lineTo(tox-headlen*Math.cos(angle+Math.PI/6),toy-headlen*Math.sin(angle+Math.PI/6));
  ctx.lineTo(tox, toy);
  ctx.fill();
}
