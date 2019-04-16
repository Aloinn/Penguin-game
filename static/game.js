// CLIENTSIDE JAVASCRIPT
var socket = io();

// RECIEVE MESSAGES FROM SERVER
socket.on('message', function(data) {
  console.log(data);
});

// ON CONNECT
socket.emit('create room');
