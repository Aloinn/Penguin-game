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

function displaySection(display){
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
var ratio = 0;
function canvasetup(){
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  ratioX = canvas.width/800;
  ratioY = canvas.height/600;
  ratio  = Math.min(ratioX,ratioY);
  ratio = Math.min(ratio,1.2)
}
window.addEventListener('resize',canvasetup);
canvasetup();

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
// ON DISCONNECT
function disconnectRoom(){
  socket.emit('leave room');
}
// UPDATES ROOM LIST
socket.on('player change', function(room) {
  // CLEAR PLAYER LIST
  for(var i = 1; i < 9; i ++){
    var txtbox = document.getElementById("p"+i.toString());
    txtbox.innerHTML = '_'
  }
  // DECLARE PLAYER LIST USING PLAYER LIST
  var i = 1;
  for(var id in room.players){
    console.log(room.players[id].name);
    var txtbox = document.getElementById("p"+i.toString());
    txtbox.innerHTML = room.players[id].name;
    i += 1;
  }
  document.getElementById('room-number').innerHTML = room.rmnm;
  console.log(room.players);
});
