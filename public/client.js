'use strict';

//connect
var socket = io.connect();

//USER VARIABLES
var username = "DefaultUser";

//start user login modal
$('#nameModal').modal();

//FORM SUBMITS
$('#nameForm').submit(function(){
	console.log("ME : " + socket.id);
	var send = {};
	username = $('#nameInput').val();
	send.room = $('#roomInput').val();
	send.name = $('#nameInput').val();
	$('#roomHeader').text(send.room);
	$('#nameHeader').text(send.name);
	socket.emit('join room', send);
	socket.emit('user joined', send);
	$('#nameModal').modal('hide');
	return false;
});

$('#startRoomForm').submit(function(){
	socket.emit('room start', $('#roomHeader').text());
	return false;
});

$('#closeSubmissionForm').submit(function(){
	socket.emit('show judging', $('#roomHeader').text());
	return false;
});

$('#chooseWinnerForm').submit(function(){
	var send = {};
	send.room = $('#roomHeader').text();
	send.name = $('#nameHeader').text();
	send.id = socket.id;
	socket.emit('show winner', send);
	return false;
});

$('#showScoreForm').submit(function(){
	socket.emit('show score', $('#roomHeader').text());
	return false;
});

//SOCKET FUNCTIONS
socket.on('user joined', function(data){
    $('#namesList').append($('<li>').text(data));
});

socket.on('user left', function(data){
    $("li").filter(":contains('" + data + "')").first().remove();
});

socket.on('room roster', function(data){
	for(var i = 0; i < data.length; i ++){
    	$('#namesList').append($('<li>').text(data[i].name));
	}
});

socket.on('room start', function(data){
	$('#waitingRoom').css('display','none');
	socket.emit('open submission', $('#roomHeader').text());
});

socket.on('open submission', function(data){
	$('#scoreboard').css('display','none');
	$('#submission').css('display','block');
	$('#submissionCaption').text("Submit a photo now.");
	for(var i = 0; i < data.length; i ++){
    	if(data[i].id == socket.id && data[i].judging){
    		$('#submissionCaption').text("You are judging this round, please wait...");
    	}
	}
});

socket.on('show judging', function(data){
	$('#submission').css('display','none');
	$('#judging').css('display','block');
	var judgeName;
	for(var i = 0; i < data.length; i ++){
    	if(data[i].judging){
    		judgeName = data[i].name;
    	}
	}
	$('#judgeName').text(judgeName + " is judging...");
});

socket.on('show winner', function(data){
	$('#judging').css('display','none');
	$('#winner').css('display','block');
	$('#winnerName').text("The winner is " + data + "!");
});

socket.on('show score', function(data){
	$('#scoreList').text("");
	$('#winner').css('display','none');
	$('#scoreboard').css('display','block');
	data.sort(function(a,b){return a.points - b.points});
	data.reverse();
	for(var i = 0; i < data.length; i ++){
    	$('#scoreList').append($('<li>').text(data[i].name + " : " + data[i].points));
	}
});