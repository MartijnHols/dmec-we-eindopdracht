var express = require('express');
var path = require('path');
var http = require('http');
var socketio = require('socket.io');

/* * * * * * * * * * * * * * * * * * * * * * */
/*     Setup                                 */
/* * * * * * * * * * * * * * * * * * * * * * */

var app = express();
var httpServer = http.Server(app);
var io = socketio(httpServer);

app.use(express.static(path.join(__dirname, 'apps/main')));
app.use('/', express.static(path.join(__dirname, 'apps/student')));
app.use('/docent', express.static(path.join(__dirname, 'apps/docent')));

var randomColor = require("./library/randomColor.js");

var players = {};  // Using an object istead of an array is
// useful because we mostly ned to find players by id

io.on("connection", function (socket) {
	console.log("CONNECT:", socket.id);

	socket.on("disconnect", function () {
		console.log("DISCONNECT", socket.id);
		// Let's handle disconnects by informing everyone,
		// and removing the player from our players.
		socket.broadcast.emit("player has left", socket.id)  // the socket id is enough for
		// all others to remove the player.
		delete players[socket.id]  // this removes the player from the object.
	});

	socket.on("sign in", function (name) {
		console.log("SIGN IN:", name);

		var newPlayer = {
			name: name,
			x: Math.floor(Math.random() * 300) + 50,
			y: Math.floor(Math.random() * 300) + 50,
			color: randomColor({ luminosity: 'bright'}),
			socketId: socket.id     // This id is useful to identify players.
			// We don't have to worry about duplicate player names.
		};
		players[newPlayer.socketId] = newPlayer;
		socket.emit("sign in reply", players);
		socket.broadcast.emit("new player", newPlayer);
	})

	socket.on("update player", function (playerInfo) {
		socket.broadcast.emit("update other player", playerInfo);

		players[playerInfo.socketId] = playerInfo;
	});

});

httpServer.listen(3000, function () {
	console.log("Server running on port 3000.");
});
