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

//general functions
function ChangeJudge(data){
	//find the current judge, make them not judging
	var hasJudge = false;
	for(var p = 0; p < roomRoster[data].length; p ++){
	if((roomRoster[data])[p].judging){
		(roomRoster[data])[p].judging = false;
		hasJudge = true;
		//if at end of list, go back to start
		if(p == roomRoster[data].length - 1){
			(roomRoster[data])[0].judging = true;
			break;
		}
		//else make next person the judge
		else{
			(roomRoster[data])[p + 1].judging = true;
			break;
			}
		}
	}	
	if(!hasJudge){
		(roomRoster[data])[0].judging = true;
	}
}

//socket io functions
io.sockets.on('connection', function(socket){

	console.log('CNCT:'+socket.id);

  	//When the client disconnects
  	socket.on('disconnect', function(){
    	console.log('DSCT:' + socket.id);
    	var room = "";
    	var name = "";
    	//find the ID in the room roster matching the disconnecting ID
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
  		//join the room, create my details object
  		var thisRoom = data.room;
  		socket.join(thisRoom);
  		var mydeets = {name:data.name, id:socket.id, points:0, judging:false};
  		//if the room exists, add me
  		if(roomRoster.hasOwnProperty(thisRoom)){
  			roomRoster[thisRoom].push(mydeets);
  		}
  		//if the room does not exist, initialize it
  		else{
  			roomRoster[thisRoom] = [];
  			mydeets.judging = true;		//I am the first one in the room, so I have to be a judge
  			roomRoster[thisRoom].push(mydeets);
  		}
  		socket.emit('room roster', roomRoster[thisRoom]);
  		console.log('Socket ' + socket.id + ' joined room ' + thisRoom);
  	});

  	//bounce
  	socket.on('show score', function(data){
  		io.in(data).emit('show score', roomRoster[data]);
  		setTimeout(function () {
        	ChangeJudge(data);
			io.in(data).emit('open submission', roomRoster[data]);
    	}, 5000);
  	});

  	socket.on('show winner', function(data){
  		//find the person whose name is the winner, give them a point
  		for(var p = 0; p < roomRoster[data.room].length; p ++){
    		if((roomRoster[data.room])[p].id == data.id){
    			(roomRoster[data.room])[p].points += 1;
    		}
    	}
  		io.in(data.room).emit('show winner', data.name);
  		setTimeout(function () {
        	io.in(data).emit('show score', roomRoster[data]);
	  		setTimeout(function () {
	        	ChangeJudge(data);
				io.in(data).emit('open submission', roomRoster[data]);
	    	}, 5000);
    	}, 5000);
  	});

  	//bounce
  	socket.on('show judging', function(data){
  		io.in(data).emit('show judging', roomRoster[data]);
  	});

  	socket.on('open submission', function(data){
		ChangeJudge(data);
		io.in(data).emit('open submission', roomRoster[data]);
	});

  	//bounce
  	socket.on('user joined', function(data){
  		socket.to(data.room).emit('user joined', data.name);
  	});

  	//bounce
  	socket.on('room start', function(data){
  		io.in(data).emit('room start', data);
  	});

});

//give the app a port and start
var port = (typeof process.env.PORT == 'undefined')?8080:process.env.PORT;
http.listen(port, function(){
  console.log('listening on port ' + port);
});