var express = require('express');
var path = require('path');
var http = require('http');
var socketio = require('socket.io');

var app = express();
var httpServer = http.Server(app);
var io = socketio(httpServer);

app.use('/', express.static(path.join(__dirname, 'app')));

/**
 *
 * @param socket
 * @param name
 * @constructor
 */
function QuizMaster(socket, name) {
	// Bewaar een referentie naar de socket van een docent zodat we hem specifiek berichten kunnen blijven sturen
	this.socket = socket;
	this.name = name;
	this.activeQuiz = null;
}
/**
 *
 * @param id string
 * @param quizMaster QuizMaster
 * @param vragen object[]
 * @constructor
 */
function Quiz(id, quizMaster) {
	this.id = id;
	this.quizMaster = quizMaster;
	quizMaster.activeQuiz = this;
	this.vragen = null;
	this.players = {};
	this.started = false;

	/**
	 * Add a new player to this quiz.
	 * @param socket
	 * @param player
	 */
	this.addPlayer = function (player) {
		if (this.started) {
			throw new Error('De quiz is al gestart: aanmelden is niet meer mogelijk.');
		}
		this.players[player.socket.id] = player;
	};
	/**
	 * Remove the provided player from this quiz.
	 * @param socketId
	 */
	this.removePlayer = function (socket) {
		delete this.players[socket.id];
		this.quizMaster.socket.emit('player-left', socket.id);
	};
	this.hasPlayer = function (socket) {
		return this.players[socket.id] !== undefined;
	};
	this.getPlayer = function (socket) {
		return this.players[socket.id];
	};
	this.start = function () {
		this.started = true;
		for (var socketId in this.players) {
			var player = this.players[socketId];
			player.socket.emit('quiz-start', vragen[0]);
		}
		this.quizMaster.socket.emit('quiz-start', vragen[0]);
	};
	/**
	 * End the quiz, removing all players.
	 */
	this.end = function () {
		var players = this.players;
		for (var socketId in players) {
			this.removePlayer(socketId);
		}
		this.quizMaster.socket.emit('quiz-end', this.id);
	};
}
function Player(socket, naam, quiz) {
	this.socket = socket;
	this.naam = naam;
	this.quiz = quiz;
	this.antwoorden = {};

	this.addAntwoord = function (vraagId, antwoord) {
		this.antwoorden[vraagId] = antwoord;
	};
	this.getScore = function () {
		var score = 0;
		for (var vraagId in this.antwoorden) {
			score += this.antwoorden[vraagId].score;
		}
		return score;
	};
}

var accountController = {
	accounts: [
		{ username: 'admin', password: 'admin', name: 'Administrator' }
	],
	findAccount: function (username, password) {
		for (var i = 0, len = this.accounts.length; i < len; i++) {
			var account = this.accounts[i];
			if (account.username === username && account.password === password) {
				return account;
			}
		}
		return null;
	}
};
var quizMasterController = {
	quizMastersOnline: {},
	login: function (socket, account) {
		this.quizMastersOnline[socket.id] = new QuizMaster(socket, account.name);
	},
	logout: function (socket) {
		delete this.quizMastersOnline[socket.id];
	},
	isLoggedIn: function (socket) {
		return (this.quizMastersOnline[socket.id] !== undefined);
	},
	get: function (socket) {
		return this.quizMastersOnline[socket.id];
	}
};
var quizController = {
	quizesActief: {},
	openQuiz: function (eigenaar) {
		var quizId = this.getRandomToken();

		this.quizesActief[quizId] = new Quiz(quizId, eigenaar);

		return quizId;
	},
	stopQuiz: function (quizId) {
		var quiz = this.quizesActief[quizId];
		quiz.end();
		delete this.quizesActief[quizId];
	},
	get: function (quizId) {
		return this.quizesActief[quizId];
	},
	logout: function (socket) {
		for (var i = 0, len = this.quizesActief.length; i < len; i++) {
			var quiz = this.quizesActief[i];
			quiz.removePlayer(socket.id);
			if (quiz.quizMaster.socket.id == socket.id) {
				this.stopQuiz(quiz.id);
			}
		}
	},
	getRandomToken: function () {
		var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghiklmnopqrstuvwxyz";
		var string_length = 6;
		var token = '';
		for (var i = 0; i < string_length; i++) {
			var charNo = Math.floor(Math.random() * chars.length);
			token += chars.substring(charNo, charNo + 1);
		}
		return token;
	}
};
var playerController = {
	players: {},
	addPlayer: function (socket, naam, quiz) {
		var player = new Player(socket, naam, quiz);
		this.players[socket.id] = player;
	},
	removePlayer: function (socket) {
		var player = this.players[socket.id];
		if (player.quiz) {
			player.quiz.removePlayer(socket);
		}
		delete this.players[socket.id];
	},
	addAntwoord: function (socket, vraagId, antwoord) {
		var player = this.players[socket.id];
		player.quiz.addAntwoord(socket, vraagId, antwoord);
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

io.on("connection", function (socket) {
    console.log("CONNECT:", socket.id);

	socket.on("disconnect", function () {
		console.log("DISCONNECT", socket.id);
		//		// Let's handle disconnects by informing everyone,
		//		// and removing the player from our players.
		//		socket.broadcast.emit("player has left", socket.id)  // the socket id is enough for
		//		// all others to remove the player.
		//		delete players[socket.id]  // this removes the player from the object.
		quizController.logout(socket.id);
	});

	socket.on("account-sign-in", function (accountInfo) {
		console.log('Login attempt for: ' + accountInfo.username + ' (' + accountInfo.password + ')');

		var account = accountController.findAccount(accountInfo.username, accountInfo.password);
		if (account) {
			console.log('Identified ' + accountInfo.username + ' as ' + account.name);

			quizMasterController.login(socket, account);

			socket.emit('account-sign-in-success', account.name);
			return;
		}
		console.log('No such user found');
		socket.emit('account-sign-in-error');
	});

	socket.on("get-collections", function (name, fn) {
		if (!quizMasterController.isLoggedIn(socket)) return fn({message:'Niet ingelogd.'});

		console.log(socket.id + ': getCollections');
		socket.emit('collections-update', collecties);
	});

	socket.on('open-quiz', function (name, fn) {
		console.log('open-quiz');
		if (!quizMasterController.isLoggedIn(socket)) return fn({message:'Niet ingelogd.'});

		var quizMaster = quizMasterController.get(socket);
		quizController.openQuiz(quizMaster);
	});
	socket.on('start-quiz', function (options, fn) {
		if (!quizMasterController.isLoggedIn(socket)) return fn({message:'Niet ingelogd.'});

		var quiz = quizController.get(options.quizId);
		if (quiz.quizMaster != quizMasterController.get(socket)) {
			return fn({message:'U bent niet quizmaster van deze quiz.'});
		}
		quiz.vragen = options.vragen;
		quiz.start();
	});
	
	socket.on('player-sign-in', function (options, fn) {
		var quiz = quizController.get(options.quizId);
		if (!quiz) {
			return fn({message:'Deze quiz bestaat niet.'});
		}
		// Create player object
		var player = playerController.addPlayer(socket, options.name, quiz);
		// Register player in our quiz
		quiz.addPlayer(player);
		// Let quiz master know
		quiz.quizMaster.socket.emit('player-joined', player);

		socket.emit('player-sign-in-success');
	});
	socket.on('player-send-answer', function (options, fn) {
		playerController.addAntwoord(socket, options.vraagId, options.antwoord);
	});
});

httpServer.listen(3000, function () {
    console.log("Server running on port 3000.");
});

