'use strict';

//check if my broswer supports the things we need
window.addEventListener("load", Ready); 
 
function Ready(){ 
    if(window.File && window.FileReader){ 
    	console.log("Found correct APIs");
    	document.getElementById('fileUpload').addEventListener('change', FileChosen);
    }
    else{
        document.getElementById('containerObj').innerHTML = "Your Browser Doesn't Support The File API! Please Update Your Browser.";
    }
}

//connect
var socket = io.connect();

//USER VARIABLES
var username = "DefaultUser";
var imgChunks = [];
var SelectedFile;
var FReader;
var fileName;
var Path = "http://localhost:8080/";

//start user login modal
$('#nameModal').modal();

//GENERAL FUNCTIONS
function FileChosen(evnt) {
    SelectedFile = evnt.target.files[0];
    document.getElementById('fileNameInput').value = SelectedFile.name;
}

function StartUpload(){
    if(document.getElementById('fileUpload').value != "")
    {
        FReader = new FileReader();
        fileName = document.getElementById('fileNameInput').value;
        FReader.onload = function(evnt){
        	var send = { 'Name' : fileName, Data : evnt.target.result };
        	send.room = send.room = $('#roomInput').val();
            socket.emit('file upload', send);
        }
        socket.emit('file start', { 'Name' : fileName, 'Size' : SelectedFile.size });
    }
    else
    {
        window.alert("Please Select A File");
    }
}

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

$('#submissionForm').submit(function(){
	StartUpload();
	$('#submissionForm').css('display','none');
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
	$('#submissionForm').css('display','block');
	$('#submission').css('display','block');
	document.getElementById('submissionImage').setAttribute('src', "");
	document.getElementById('submissionImage').setAttribute('alt', "");
	$('#submissionCaption').text("Submit a photo that best represents the prompt below.");
	for(var i = 0; i < data.length; i ++){
    	if(data[i].id == socket.id && data[i].judging){
    		$('#submissionCaption').text("You are judging this round. The prompt for this round is...");
    		$('#submissionForm').css('display','none');
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

socket.on('show submissions', function(data){
	$('#picDisplays').text("");
	for(var i = 0; i < data.length; i ++){
		if($('#judgeName').text().replace(' is judging...','') != data[i].name){
			var thisRow = $('<div>').attr('class','row').appendTo($('#picDisplays'));
			var col1 = $('<div>').attr('class','col-6').appendTo(thisRow);
			var col2 = $('<div>').attr('class','col-6').appendTo(thisRow);
			$('<img>').attr({ src: Path + "Images/" + data[i].submission, width: '80%'}).appendTo(col1);
			var thisForm = $('<form>').attr('class','chooseWinnerForm').appendTo(col2);
			thisForm.css('padding-top','40%');
			thisForm.css('class','chooseWinnerForm');
			var thisButton = $('<button>').attr({ 'type':'submit', 'class':'btn btn-primary' }).appendTo(thisForm);
			thisButton.text("Choose Winner");
			var thisInput = $('<input>').attr({ 'type':'text' }).appendTo(thisForm);
			thisInput.css('display','none');
    	}
	}
	$('.chooseWinnerForm').submit(function(){
		window.alert("CHOOSE WINNER");
		var send = {};
		send.room = $('#roomHeader').text();
		send.id = $( "input:first" ).val();
		window.alert(send.id);
		socket.emit('show winner', send);
		return false;
	});
});

socket.on('show winner', function(data){
	$('#judging').css('display','none');
	$('#winner').css('display','block');
	$('#winnerName').text("The winner is " + data + "!");
});

socket.on('prompt', function(data){
	$('#prompt').text(data);
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

socket.on('winner path', function(data){
	var img = document.getElementById('winnerImage');
	img.setAttribute('src', Path + "Images/" + data);
});

socket.on('MoreData', function (data){
    var Place = data['Place'] * 524288; //The Next Blocks Starting Position
    var NewFile = SelectedFile.slice(Place, Place + Math.min(524288, (SelectedFile.size-Place)));
    FReader.readAsBinaryString(NewFile);
});

socket.on('image done', function(data){
	document.getElementById('submissionImage').setAttribute('src', Path + data['Image']);
	document.getElementById('submissionImage').setAttribute('alt', fileName);
	document.getElementById('fileNameInput').value = "";
	document.getElementById('fileUpload').value = "";
});