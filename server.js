var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

//give clients public folder, for css and js
app.use(express.static('public'));

//serve index.html
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

//socket io functions
io.sockets.on('connection', function(socket){

	console.log('CNCT:'+socket.id);

  	//When the client disconnects
  	socket.on('disconnect', function(){
    	console.log('DSCT:'+socket.id);
  	});

	socket.on('chat message', function(msg){
    	socket.broadcast.emit('chat message', msg);
 	});

});

//give the app a port and start
var port = (typeof process.env.PORT == 'undefined')?8080:process.env.PORT;
http.listen(port, function(){
  console.log('listening on port ' + port);
});