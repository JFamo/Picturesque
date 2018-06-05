var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http, {'pingInterval':1000, 'pingTimeout':120000});
var fs = require("fs");
var path = require("path");

//track people in rooms
var roomRoster = {};		//contains names, ids, judging
var roomProgress = {};		//contains states of rooms
var roomSubmissions = {};	//associates users with pictures they submitted

//give clients public folder, for css and js
app.use(express.static('public'));
app.use('/Images', express.static('Images'));

//serve index.html
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

//open prompts text file into array
var text = fs.readFileSync("./prompts.txt").toString('utf-8');
var prompts = text.split("\n");
var Files = {};

//~~~~~~~~~~~~GENERAL FUNCTIONS~~~~~~~~~~~~~

//updates the current judge in the room roster
//data is the room name
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

//shows the scoreboard and returns to submission after 5 secs
//data is the room name
function ShowScore(data){
	io.in(data).emit('show score', roomRoster[data]);
	//rmDir("Images", false);
	for(var r in roomSubmissions){
		for(var p = 0; p < roomSubmissions[r].length; p ++){
			(roomSubmissions[r])[p].submission = null;
		}
	}
  	setTimeout(function () {
        ChangeJudge(data);
        io.in(data).emit('prompt', prompts[Math.floor(Math.random()*prompts.length)]);
		io.in(data).emit('open submission', roomRoster[data]);
    }, 5000);
}

//clears the Images folder
function rmDir(dirPath, removeSelf) {
      if (removeSelf === undefined)
        removeSelf = true;
      try { var files = fs.readdirSync(dirPath); }
      catch(e) { return; }
      if (files.length > 0)
        for (var i = 0; i < files.length; i++) {
          var filePath = path.join(dirPath, files[i]);
          if (fs.statSync(filePath).isFile())
            fs.unlinkSync(filePath);
          else
            rmDir(filePath);
        }
      if (removeSelf)
        fs.rmdirSync(dirPath);
    };

//socket io functions
io.sockets.on('connection', function(socket){

	console.log('CNCT:'+socket.id);		//Ethan Witherington 2017

	//When the client reconnects
  	socket.on('reconnect', function(){
    	console.log('RCNT:' + socket.id);	//Joshua Famous 2018
  	});

  	//When the client disconnects
  	socket.on('disconnect', function(reason){
    	console.log('DSCT:' + socket.id + " for " + reason);	//Ethan Witherington 2017
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
    	//remove my record from the submissions tracking
    	for(var r in roomSubmissions){
    		for(var p = 0; p < roomSubmissions[r].length; p ++){
    			if((roomSubmissions[r])[p].id == socket.id){
    				roomSubmissions[r].splice(p, 1);
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
  		//same thing for room submissions
  		mydeets = {id:socket.id, submission:null, name:data.name};
  		if(roomSubmissions.hasOwnProperty(thisRoom)){
  			(roomSubmissions[thisRoom]).push(mydeets);
  		}
  		//if the room does not exist, initialize it
  		else{
  			roomSubmissions[thisRoom] = [];
  			(roomSubmissions[thisRoom]).push(mydeets);
  		}
  		socket.emit('room roster', roomRoster[thisRoom]);
  		console.log('Socket ' + socket.id + ' joined room ' + thisRoom);
  	});

  	socket.on('show winner', function(data){
  		var winnerName;
  		//find the person whose name is the winner, give them a point
  		for(var p = 0; p < roomRoster[data.room].length; p ++){
			if((roomRoster[data.room])[p].id == data.id){
				(roomRoster[data.room])[p].points += 1;
				winnerName = (roomRoster[data.room])[p].name;
			}
		}
		//find the image name of the winner
		var winnerImagePath;
		for(var p = 0; p < roomSubmissions[data.room].length; p ++){
			if((roomSubmissions[data.room])[p].id == data.id){
				winnerImagePath = (roomSubmissions[data.room])[p].submission;
			}
		}
		io.in(data.room).emit('winner path', winnerImagePath);
  		io.in(data.room).emit('show winner', winnerName);
  		setTimeout(function(){
  			ShowScore(data.room);
  		}, 5000);
  	});

  	socket.on('file start', function (data) { 
        var Name = data['Name'];
        Files[Name] = {
            FileSize : data['Size'],
            Data     : "",
            Downloaded : 0
        }
        var Place = 0;
        try{
            var Stat = fs.statSync('Images/' +  Name);
            if(Stat.isFile())
            {
                Files[Name]['Downloaded'] = Stat.size;
                Place = Stat.size / 524288;
            }
        }
        catch(er){} //It's a New File
        fs.open("Images/" + Name, "a", 0755, function(err, fd){
            if(err)
            {
                console.log(err);
            }
            else
            {
                Files[Name]['Handler'] = fd; //We store the file handler so we can write to it later
                socket.emit('MoreData', { 'Place' : Place, Percent : 0 });
            }
        });
	});

	socket.on('file upload', function (data){
        var Name = data['Name'];
        Files[Name]['Downloaded'] += data['Data'].length;
        Files[Name]['Data'] += data['Data'];
        if(Files[Name]['Downloaded'] == Files[Name]['FileSize']) //If File is Fully Uploaded
        {
            fs.write(Files[Name]['Handler'], Files[Name]['Data'], null, 'Binary', function(err, Writen){
                socket.emit('image done', {'Image' : 'Images/' + Name});
            });
            //add this to the user's submissions
            for(var p = 0; p < roomSubmissions[data.room].length; p ++){
				if((roomSubmissions[data.room])[p].id == socket.id){
					(roomSubmissions[data.room])[p].submission = Name;
				}
			}
            //check if everyone has submitted something
            var missingSubmission = false;
            for(var p = 0; p < roomSubmissions[data.room].length; p ++){
				if((roomSubmissions[data.room])[p].submission == null){
					if((roomRoster[data.room])[p].judging == false){
						missingSubmission = true;
					}
				}
			}
			if(!missingSubmission){
				io.in(data.room).emit('show judging', roomRoster[data.room]);
				io.in(data.room).emit('show submissions', roomSubmissions[data.room]);
			}
        }
        else if(Files[Name]['Data'].length > 10485760){ //If the Data Buffer reaches 10MB
            fs.write(Files[Name]['Handler'], Files[Name]['Data'], null, 'Binary', function(err, Writen){
                Files[Name]['Data'] = ""; //Reset The Buffer
                var Place = Files[Name]['Downloaded'] / 524288;
                var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
                socket.emit('MoreData', { 'Place' : Place, 'Percent' :  Percent});
            });
        }
        else
        {
            var Place = Files[Name]['Downloaded'] / 524288;
            var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
            socket.emit('MoreData', { 'Place' : Place, 'Percent' :  Percent});
        }
    });

  	socket.on('open submission', function(data){
		ChangeJudge(data);
		io.in(data).emit('prompt', prompts[Math.floor(Math.random()*prompts.length)]);
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
