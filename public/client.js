//connect
var socket = io.connect();

//ajax submit handling
$('#nameModal').modal();

$('#messageForm').submit(function(){
	$('#messages').append($('<li class="userMessage">').text($('#m').val()));
    socket.emit('chat message', $('#m').val());
    $('#m').val('');
    return false;
});

$('#nameForm').submit(function(){
    socket.emit('user joined', $('#nameInput').val());
    $('#nameModal').modal('hide');
    return false;
});
   
socket.on('chat message', function(data){
    $('#messages').append($('<li>').text(data));
});

socket.on('user joined', function(data){
    $('#messages').append($('<li class="entryMessage">').text("User " + data + " joined!"));
});