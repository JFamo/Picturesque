'use strict';

//connect
var socket = io.connect();

//USER VARIABLES
var username = "DefaultUser";

//start user login modal
$('#nameModal').modal();

//FORM SUBMITS
$('#nameForm').submit(function(){
	var send = {};
	username = $('#nameInput').val();
	send.room = $('#roomInput').val();
	send.name = $('#nameInput').val();
	socket.emit('join room', send);
	socket.emit('user joined', send);
	$('#nameModal').modal('hide');
	return false;
});

//SOCKET FUNCTIONS
socket.on('user joined', function(data){
    $('#namesList').append($('<li>').text(data));
});

socket.on('room roster', function(data){
	for(var i = 0; i < data.length; i ++){
    	$('#namesList').append($('<li>').text(data[i].name));
	}
});