var express = require('express');
var path = require('path');
var http = require('http');
var socketio = require('socket.io');

var app = express();
var httpServer = http.Server(app);
var io = socketio(httpServer);

app.use('/', express.static(path.join(__dirname, 'app')));

var accounts = [
		{ username: 'admin', name: 'Administrator', password: 'admin'}
	],
	findAccount = function (username, password) {
		for (var i = 0, len = accounts.length; i < len; i++) {
			var account = accounts[i];
			if (account.username === username && account.password === password) {
				return account;
			}
		}
		return null;
	},
	accountsOnline = [];

var collecties = [
	{test:1}
];

//var players = {};  // Using an object istead of an array is



io.on("connection", function (socket) {
	console.log("CONNECT:", socket.id);

	socket.on("disconnect", function () {
		console.log("DISCONNECT", socket.id);
//		// Let's handle disconnects by informing everyone,
//		// and removing the player from our players.
//		socket.broadcast.emit("player has left", socket.id)  // the socket id is enough for
//		// all others to remove the player.
//		delete players[socket.id]  // this removes the player from the object.
		delete accountsOnline[socket.id];
	});

	socket.on("sign in", function (accountInfo) {
		console.log('Login attempt for: ' + accountInfo.username + ' (' + accountInfo.password + ')');

		var account = findAccount(accountInfo.username, accountInfo.password);
		if (account) {
			console.log('Identified ' + accountInfo.username + ' as ' + account.name);
			accountsOnline[socket.id] = account;
			socket.emit('sign in success', account.name);
			return;
		}
		console.log('No such user found');
		socket.emit('sign in error');
	});

//	socket.on("update player", function (playerInfo) {
//		socket.broadcast.emit("update other player", playerInfo);
//
//		players[playerInfo.socketId] = playerInfo;
//	});

});

httpServer.listen(3000, function () {
	console.log("Server running on port 3000.");
});
