// CLIENTSIDE JAVASCRIPT
var socket = io();

// RECIEVE MESSAGES FROM SERVER
socket.on('message', function(data) {
  console.log(data);
});

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

// ON CONNECT
socket.emit('create room');
