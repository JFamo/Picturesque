var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require("fs");
var path = require("path");

//track people in rooms
var roomRoster = {};
var roomProgress = {};

//give clients public folder, for css and js
app.use(express.static('public'));

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
  	setTimeout(function () {
        ChangeJudge(data);
        io.in(data).emit('prompt', prompts[Math.floor(Math.random()*prompts.length)]);
		io.in(data).emit('open submission', roomRoster[data]);
    }, 5000);
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

  	socket.on('show winner', function(data){
  		//find the person whose name is the winner, give them a point
  		for(var p = 0; p < roomRoster[data.room].length; p ++){
			if((roomRoster[data.room])[p].id == data.id){
				(roomRoster[data.room])[p].points += 1;
			}
		}
		//grab and send winner image
		var readStream = fs.createReadStream(path.resolve(__dirname, "./blangdon.jpg"), {
			encoding: 'binary'
		}), chunks = [];

		readStream.on('readable', function(chunk){
			console.log("Image loading");
		});

		readStream.on('data', function(chunk){
			chunks.push(chunk);
			io.in(data.room).emit('img-chunk', chunk);
		});

		readStream.on('end', function(chunk){
			console.log("Image loaded");
		});

  		io.in(data.room).emit('show winner', data.name);
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

  	//bounce
  	socket.on('show judging', function(data){
  		io.in(data).emit('show judging', roomRoster[data]);
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
