var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

//track people in rooms
var roomRoster = {};

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
    	console.log('DSCT:' + socket.id);
    	var room = "";
    	var name = "";
    	for(var r in roomRoster){
    		for(var p = 0; p < roomRoster[r].length; p ++){
    			if((roomRoster[r])[p].id == socket.id){
    				name = (roomRoster[r])[p].name;
    				roomRoster[r].splice(p, 1);
    				room = r + "";
    			}
    		}
    	}
    	socket.to(room).emit('user left', name);
  	});

  	socket.on('join room', function(data){
  		console.log(roomRoster);
  		var thisRoom = data.room;
  		socket.join(thisRoom);
  		var mydeets = {name:data.name, id:socket.id};
  		console.log("has room " + thisRoom + " is " + (thisRoom in roomRoster));
  		if(roomRoster.hasOwnProperty(thisRoom)){
  			roomRoster[thisRoom].push(mydeets);
  		}
  		else{
  			roomRoster[thisRoom] = [];
  			roomRoster[thisRoom].push(mydeets);
  		}
  		socket.emit('room roster', roomRoster[thisRoom]);
  		console.log('Socket ' + socket.id + ' joined room ' + thisRoom);
  	});

  	socket.on('user joined', function(data){
  		socket.to(data.room).emit('user joined', data.name);
  	});

});

//give the app a port and start
var port = (typeof process.env.PORT == 'undefined')?8080:process.env.PORT;
http.listen(port, function(){
  console.log('listening on port ' + port);
});