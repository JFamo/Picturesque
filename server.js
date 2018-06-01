var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

//track people in rooms
var roomRoster = {};
var roomProgress = {};

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
  		var thisRoom = data.room;
  		socket.join(thisRoom);
  		var mydeets = {name:data.name, id:socket.id, points:0, judging:false};
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

  	socket.on('show score', function(data){
  		io.in(data).emit('show score', roomRoster[data]);
  	});

  	socket.on('show winner', function(data){
  		for(var p = 0; p < roomRoster[data.room].length; p ++){
    		if((roomRoster[data.room])[p].name == data.name){
    			(roomRoster[data.room])[p].points += 1;
    		}
    	}
  		io.in(data.room).emit('show winner', data.name);
  	});

  	socket.on('show judging', function(data){
  		io.in(data).emit('show judging', roomRoster[data]);
  	});

  	socket.on('open submission', function(data){
  		io.in(data).emit('open submission', roomRoster[data]);
  	});

  	socket.on('user joined', function(data){
  		socket.to(data.room).emit('user joined', data.name);
  	});

  	socket.on('room start', function(data){
  		io.in(data).emit('room start', data);
  	});

});

//give the app a port and start
var port = (typeof process.env.PORT == 'undefined')?8080:process.env.PORT;
http.listen(port, function(){
  console.log('listening on port ' + port);
});