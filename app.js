var express = require('express');
var path = require('path');
var http = require('http');
var socketio = require('socket.io');

var app = express();
var httpServer = http.Server(app);
var io = socketio(httpServer);

app.use('/', express.static(path.join(__dirname, 'app')));

var accountController = {
    accounts: [
        { username: 'admin', name: 'Administrator', password: 'admin'}
    ],
    findAccount: function (username, password) {
        for (var i = 0, len = this.accounts.length; i < len; i++) {
            var account = this.accounts[i];
            if (account.username === username && account.password === password) {
                return account;
            }
        }
        return null;
    },
    accountsOnline: [],
    login: function (socketId, account) {
        this.accountsOnline[socketId] = account;
    },
    logout: function (socketId) {
        delete this.accountsOnline[socketId];
    },
    isLoggedIn: function (socketId) {
        return (this.accountsOnline[socketId] !== undefined);
    }
};

var collecties = [
    {
        id: 1,
        naam: 'AJAX',
        vragen: [
            {
                id: 1,
                vraag: 'Waar kan je AJAX voor gebruiken?',
                visible: true,
                antwoorden: [
                    {id: 0, antwoord: 'Het asynchroon updaten van content.', score: 10},
                    {id: 1, antwoord: 'Het asynchroon verzenden en ophalen van gegevens.', score: 10},
                    {id: 2, antwoord: 'Het asynchroon wijzigen van de pagina.', score: 5},
                    {id: 3, antwoord: 'Als protocol voor de verzending van data.', score: 0}
                ]
            },
            {
                id: 2,
                vraag: 'Waar zou AJAX handig voor zijn?',
                visible: false,
                antwoorden: [
                    {id: 0, antwoord: 'Antwoord 1', score: 0},
                    {id: 1, antwoord: 'Antwoord 2', score: 5},
                    {id: 2, antwoord: 'Antwoord 3', score: 10}
                ]
            },
            {
                id: 3,
                vraag: 'Waar is AJAX niet goed voor?',
                visible: true,
                antwoorden: [
                    {id: 0, antwoord: 'Antwoord 1', score: 0},
                    {id: 1, antwoord: 'Antwoord 2', score: 5},
                    {id: 2, antwoord: 'Antwoord 3', score: 10}
                ]
            }
        ]
    },
    {
        id: 2,
        naam: 'HTML 5',
        vragen: [
            {
                id: 4,
                vraag: 'Waar staat HTML 5 voor?',
                visible: true,
                antwoorden: [
                    {id: 0, antwoord: 'Antwoord 1', score: 0},
                    {id: 1, antwoord: 'Antwoord 2', score: 5},
                    {id: 2, antwoord: 'Antwoord 3', score: 10}
                ]
            },
            {
                id: 5,
                vraag: 'Waar zou HTML 5 handig voor zijn?',
                visible: false,
                antwoorden: [
                    {id: 0, antwoord: 'Antwoord 1', score: 0},
                    {id: 1, antwoord: 'Antwoord 2', score: 5},
                    {id: 2, antwoord: 'Antwoord 3', score: 10}
                ]
            },
            {
                id: 6,
                vraag: 'Waar is HTML 5 niet goed voor?',
                visible: true,
                antwoorden: [
                    {id: 0, antwoord: 'Antwoord 1', score: 0},
                    {id: 1, antwoord: 'Antwoord 2', score: 5},
                    {id: 2, antwoord: 'Antwoord 3', score: 10}
                ]
            }
        ]
    },
    {
        id: 3,
        naam: 'CSS 3',
        vragen: [
            {
                id: 7,
                vraag: 'Waar staat CSS 3 voor?',
                visible: true,
                antwoorden: [
                    {id: 0, antwoord: 'Antwoord 1', score: 0},
                    {id: 1, antwoord: 'Antwoord 2', score: 5},
                    {id: 2, antwoord: 'Antwoord 3', score: 10}
                ]
            },
            {
                id: 8,
                vraag: 'Waar zou CSS 3 handig voor zijn?',
                visible: true,
                antwoorden: [
                    {id: 0, antwoord: 'Antwoord 1', score: 0},
                    {id: 1, antwoord: 'Antwoord 2', score: 5},
                    {id: 2, antwoord: 'Antwoord 3', score: 10}
                ]
            },
            {
                id: 9,
                vraag: 'Waar is CSS 3 niet goed voor?',
                visible: true,
                antwoorden: [
                    {id: 0, antwoord: 'Antwoord 1', score: 0},
                    {id: 1, antwoord: 'Antwoord 2', score: 5},
                    {id: 2, antwoord: 'Antwoord 3', score: 10}
                ]
            }
        ]
    },
    {
        id: 4,
        naam: 'PHP',
        vragen: [
            {
                id: 10,
                vraag: 'Waar staat PHP voor?',
                visible: true,
                antwoorden: [
                    {id: 0, antwoord: 'Antwoord 1', score: 0},
                    {id: 1, antwoord: 'Antwoord 2', score: 5},
                    {id: 2, antwoord: 'Antwoord 3', score: 10}
                ]
            },
            {
                id: 11,
                vraag: 'Waar zou PHP handig voor zijn?',
                visible: false,
                antwoorden: [
                    {id: 0, antwoord: 'Antwoord 1', score: 0},
                    {id: 1, antwoord: 'Antwoord 2', score: 5},
                    {id: 2, antwoord: 'Antwoord 3', score: 10}
                ]
            },
            {
                id: 12,
                vraag: 'Waar is PHP niet goed voor?',
                visible: true,
                antwoorden: [
                    {id: 0, antwoord: 'Antwoord 1', score: 0},
                    {id: 1, antwoord: 'Antwoord 2', score: 5},
                    {id: 2, antwoord: 'Antwoord 3', score: 10}
                ]
            }
        ]
    }
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
        accountController.logout(socket.id);
    });

    socket.on("sign in", function (accountInfo) {
        console.log('Login attempt for: ' + accountInfo.username + ' (' + accountInfo.password + ')');

        var account = accountController.findAccount(accountInfo.username, accountInfo.password);
        if (account) {
            console.log('Identified ' + accountInfo.username + ' as ' + account.name);
            accountController.login(socket.id, account);
            socket.emit('sign in success', account.name);
            return;
        }
        console.log('No such user found');
        socket.emit('sign in error');
    });

    socket.on("getCollections", function (name, fn) {
        /**
         * TODO: Tijdelijk uitgezet voor Dwayne
         */
//		if (!accountController.isLoggedIn(socket.id)) return fn({message:'Niet ingelogd.'});

        console.log(socket.id + ': getCollections');
        socket.emit('collectionUpdate', collecties);
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

