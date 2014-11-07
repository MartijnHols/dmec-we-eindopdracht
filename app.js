'use strict';

var express = require('express');
var path = require('path');
var http = require('http');
var socketio = require('socket.io');
var mongojs = require('mongojs');

var connectionString = '127.0.0.1/kwizles',
	db = mongojs(connectionString, ['ranglijst']);

var app = express();
var httpServer = http.Server(app);
var io = socketio(httpServer);

app.use('/', express.static(path.join(__dirname, 'app')));

var maxVraagTijd = 10 * 1000; // in ms

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

var QuizFase = {
	Open: 1,
	Vragen: 2,
	Ranglijst: 3
};

/**
 * @param id string
 * @param quizMaster QuizMaster
 * @param vragen object[]
 * @constructor
 */
function Quiz(id, quizMaster) {
	this.id = id;
	this.quizMaster = quizMaster;
	quizMaster.activeQuiz = this;
	this.players = {};

	// Gestarte quizes
	this.vragen = null;
	this.vraagNr = null;
	this.vraagStartTime = null;
	this.fase = QuizFase.Open; // standaard

	/**
	 * Add a new player to this quiz.
	 * @param player
	 */
	this.addPlayer = function (player) {
		if (this.fase !== QuizFase.Open) {
			throw {
				name: 'QuizAlreadyStartedError',
				message: 'De quiz is al gestart: aanmelden is niet meer mogelijk.'
			};
		}
		this.players[player.socket.id] = player;
	};
	/**
	 * Remove the provided player from this quiz.
	 * @param socket
	 */
	this.removePlayer = function (socket) {
		socket.emit('quiz-end', this.id);
		delete this.players[socket.id];
		this.quizMaster.socket.emit('player-left', socket.id);
	};
	this.hasPlayer = function (socket) {
		return this.players[socket.id] !== undefined;
	};
	this.getPlayer = function (socket) {
		return this.players[socket.id];
	};
	/**
	 * Start de quiz.
	 */
	this.start = function () {
		if (this.vragen.length === 0) {
			throw {
				name: 'GeenVragenError',
				message: 'De quiz kan niet gestart worden zonder vragen.'
			};
		}
		this.fase = QuizFase.Vragen;
		this.nextQuestion();
	};
	/**
	 * End the quiz, removing all players.
	 */
	this.end = function () {
		var players = this.players;
		for (var socketId in players) {
			var player = players[socketId];
			this.removePlayer(player.socket);
		}
		this.quizMaster.socket.emit('quiz-end', this.id);
		this.quizMaster.activeQuiz = null;
	};

	/**
	 * Is er een vraag op dit moment actief waarvan de tijd nog niet is verlopen?
	 * @returns boolean
	 */
	this.isVraagActief = function () {
		return (this.vraagStartTime && ((+new Date()) - this.vraagStartTime) < maxVraagTijd);
	};

	this.nextQuestion = function () {
		if (this.isVraagActief()) {
			throw {
				name: "CurrentQuestionTimeError",
				message: "De tijd voor de huidige vraag is nog niet op."
			}
		}
		if (this.vraagNr === null) {
			this.vraagNr = 1;
		} else {
			this.vraagNr++;
		}
		if (this.vraagNr > this.vragen.length) {
			throw {
				name: "NoMoreQuestionsError",
				message: "Er zijn niet meer vragen."
			};
		}

		var vraagInfo = {
			vraagNr: this.vraagNr,
			aantalVragen: this.vragen.length,
			vraag: this.vragen[(this.vraagNr - 1)]
		};
		//TODO: Implement below
		//		// Clone vraag om de antwoord scores weg te halen voor spelers (geen valsspelers)
		//		var playerVraagInfo = JSON.parse(JSON.stringify(vraagInfo));
		//		for (var key in playerVraagInfo.vraag.antwoorden) {
		//			var antwoord = playerVraagInfo.vraag.antwoorden[key];
		//			delete antwoord.score;
		//		}

		for (var socketId in this.players) {
			var player = this.players[socketId];
			player.socket.emit('nieuwe-vraag', vraagInfo);
		}
		this.quizMaster.socket.emit('nieuwe-vraag', vraagInfo);

		this.vraagStartTime = +new Date();
	};

	function getMaxScore(vragen) {
		var maxScore = 0;
		for (var key in vragen) {
			var vraag = vragen[key];

			maxScore += getMaxScoreVanVraag(vraag);
		}

		return maxScore;
	}

	function getMaxScoreVanVraag(vraag) {
		// Vind de max score die bij deze vraag te halen valt
		var maxAntwoordScore = 0;
		for (var key in vraag.antwoorden) {
			var antwoord = vraag.antwoorden[key];
			if (antwoord.score > maxAntwoordScore) {
				maxAntwoordScore = antwoord.score;
			}
		}

		return maxAntwoordScore;
	}

	this.stuurRanglijst = function () {
		var maxScore = getMaxScore(this.vragen);

		var ranglijst = [];
		for (var socketId in this.players) {
			var player = this.players[socketId];

			var score = player.getScore();
			ranglijst.push({
				naam: player.naam,
				score: score,
				maxScore: maxScore
			});
		}

		for (var socketId in this.players) {
			var player = this.players[socketId];
			player.socket.emit('ranglijst', ranglijst);
		}
		this.quizMaster.socket.emit('ranglijst', ranglijst);

		this.fase = QuizFase.Ranglijst;

		db.ranglijst.save({created: new Date(), ranglijst: ranglijst});
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
			quiz.removePlayer(socket);
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
		return player;
	},
	removePlayer: function (socket) {
		var player = this.players[socket.id];
		if (player.quiz) {
			player.quiz.removePlayer(socket);
		}
		delete this.players[socket.id];
	},
	isNameInUse: function (naam) {
		for (var socketId in this.players) {
			var player = this.players[socketId];
			if (player.naam.toLowerCase() == naam.toLowerCase()) {
				return true;
			}
		}
		return false;
	},
	isLoggedIn: function (socket) {
		return (this.players[socket.id] !== undefined);
	},
	get: function (socket) {
		return this.players[socket.id];
	}
};

var collecties = {
	1: {
		id: 1,
		naam: 'AJAX',
		vragen: {
			1: {
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
			2: {
				id: 2,
				vraag: 'Waar zou AJAX handig voor zijn?',
				visible: false,
				antwoorden: [
					{id: 0, antwoord: 'Antwoord 1', score: 0},
					{id: 1, antwoord: 'Antwoord 2', score: 5},
					{id: 2, antwoord: 'Antwoord 3', score: 10}
				]
			},
			3: {
				id: 3,
				vraag: 'Waar is AJAX niet goed voor?',
				visible: true,
				antwoorden: [
					{id: 0, antwoord: 'Antwoord 1', score: 0},
					{id: 1, antwoord: 'Antwoord 2', score: 5},
					{id: 2, antwoord: 'Antwoord 3', score: 10}
				]
			}
		}
	},
	2: {
		id: 2,
		naam: 'HTML 5',
		vragen: {
			4: {
				id: 4,
				vraag: 'Waar staat HTML 5 voor?',
				visible: true,
				antwoorden: [
					{id: 0, antwoord: 'Antwoord 1', score: 0},
					{id: 1, antwoord: 'Antwoord 2', score: 5},
					{id: 2, antwoord: 'Antwoord 3', score: 10}
				]
			},
			5: {
				id: 5,
				vraag: 'Waar zou HTML 5 handig voor zijn?',
				visible: false,
				antwoorden: [
					{id: 0, antwoord: 'Antwoord 1', score: 0},
					{id: 1, antwoord: 'Antwoord 2', score: 5},
					{id: 2, antwoord: 'Antwoord 3', score: 10}
				]
			},
			6: {
				id: 6,
				vraag: 'Waar is HTML 5 niet goed voor?',
				visible: true,
				antwoorden: [
					{id: 0, antwoord: 'Antwoord 1', score: 0},
					{id: 1, antwoord: 'Antwoord 2', score: 5},
					{id: 2, antwoord: 'Antwoord 3', score: 10}
				]
			}
		}
	},
	3: {
		id: 3,
		naam: 'CSS 3',
		vragen: {
			7: {
				id: 7,
				vraag: 'Waar staat CSS 3 voor?',
				visible: true,
				antwoorden: [
					{id: 0, antwoord: 'Antwoord 1', score: 0},
					{id: 1, antwoord: 'Antwoord 2', score: 5},
					{id: 2, antwoord: 'Antwoord 3', score: 10}
				]
			},
			8: {
				id: 8,
				vraag: 'Waar zou CSS 3 handig voor zijn?',
				visible: true,
				antwoorden: [
					{id: 0, antwoord: 'Antwoord 1', score: 0},
					{id: 1, antwoord: 'Antwoord 2', score: 5},
					{id: 2, antwoord: 'Antwoord 3', score: 10}
				]
			},
			9: {
				id: 9,
				vraag: 'Waar is CSS 3 niet goed voor?',
				visible: true,
				antwoorden: [
					{id: 0, antwoord: 'Antwoord 1', score: 0},
					{id: 1, antwoord: 'Antwoord 2', score: 5},
					{id: 2, antwoord: 'Antwoord 3', score: 10}
				]
			}
		}
	},
	4: {
		id: 4,
		naam: 'PHP',
		vragen: {
			10: {
				id: 10, vraag: 'Waar staat PHP voor?', visible: true, antwoorden: [
					{id: 0, antwoord: 'Antwoord 1', score: 0},
					{id: 1, antwoord: 'Antwoord 2', score: 5},
					{id: 2, antwoord: 'Antwoord 3', score: 10}
				]
			},
			11: {
				id: 11, vraag: 'Waar zou PHP handig voor zijn?', visible: false, antwoorden: [
					{id: 0, antwoord: 'Antwoord 1', score: 0},
					{id: 1, antwoord: 'Antwoord 2', score: 5},
					{id: 2, antwoord: 'Antwoord 3', score: 10}
				]
			},
			12: {
				id: 12, vraag: 'Waar is PHP niet goed voor?', visible: true, antwoorden: [
					{id: 0, antwoord: 'Antwoord 1', score: 0},
					{id: 1, antwoord: 'Antwoord 2', score: 5},
					{id: 2, antwoord: 'Antwoord 3', score: 10}
				]
			}
		}
	}
};

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
		if (!quizMasterController.isLoggedIn(socket)) {
			return fn({message: 'Niet ingelogd.'});
		}

		console.log(socket.id + ': getCollections');
		socket.emit('collections-update', collecties);
	});

	socket.on('open-quiz', function (name, fn) {
		console.log('open-quiz');
		if (!quizMasterController.isLoggedIn(socket)) {
			return fn({message: 'Niet ingelogd.'});
		}

		var quizMaster = quizMasterController.get(socket);
		var quizId = quizController.openQuiz(quizMaster);
		console.log(quizId);
		socket.emit('quiz-opened', quizId);
	});
	socket.on('start-quiz', function (options, fn) {
		if (!quizMasterController.isLoggedIn(socket)) {
			return fn({message: 'Niet ingelogd.'});
		}

		var quiz = quizController.get(options.quizId);
		if (quiz.quizMaster != quizMasterController.get(socket)) {
			return fn({message: 'U bent niet quizmaster van deze quiz.'});
		}
		quiz.vragen = options.vragen;
		try {
			quiz.start();
		} catch (error) {
			return fn(error);
		}
	});
	socket.on('end-quiz', function (_, fn) {
		if (!quizMasterController.isLoggedIn(socket)) {
			return fn({message: 'Niet ingelogd.'});
		}

		var quizMaster = quizMasterController.get(socket);
		var quiz = quizMaster.activeQuiz;
		try {
			quiz.end();
		} catch (error) {
			return fn(error);
		}
	});

	socket.on('player-sign-in', function (options, fn) {
		if (playerController.isNameInUse(options.naam)) {
			return fn({ message: 'Deze naam wordt al gebruikt. Voer een andere naam in.' });
		}
		var quiz = quizController.get(options.quizId);
		if (!quiz) {
			return fn({message: 'Er bestaat geen quiz met deze code.'});
		}
		// Create player object
		var player = playerController.addPlayer(socket, options.naam, quiz);
		try {
			// Register player in our quiz
			quiz.addPlayer(player);
		} catch (error) {
			return fn(error);
		}
		// Let quiz master know
		//		quiz.quizMaster.socket.emit('player-joined', player.naam);
		deelnemersUpdate(quiz.quizMaster);

		socket.emit('player-sign-in-success');
	});
	//TODO: player-disconnect
	socket.on('player-send-answer', function (options) {
		playerController.addAntwoord(socket, options.vraagId, options.antwoord);
	});

	function deelnemersUpdate(quizMaster) {
		console.log('deelnemersUpdate');

		var quiz = quizMaster.activeQuiz;

		var names = [];
		for (var socketId in quiz.players) {
			var item = quiz.players[socketId];
			names.push({ socketId: socketId, naam: item.naam });
		}

		console.log('deelnemers-update', names);
		quizMaster.socket.emit('deelnemers-update', names);
		return names;
	}

	socket.on('get-deelnemers', function (_, fn) {
		if (!quizMasterController.isLoggedIn(socket)) {
			return fn({message: 'Niet ingelogd.'});
		}

		deelnemersUpdate(quizMasterController.get(socket));
	});

	socket.on('next-question', function (_, fn) {
		if (!quizMasterController.isLoggedIn(socket)) {
			return fn({message: 'Niet ingelogd.'});
		}

		var quizMaster = quizMasterController.get(socket);
		var quiz = quizMaster.activeQuiz;
		if (!quiz) {
			return fn({ message: 'Er is geen quiz op dit moment actief.' });
		}
		try {
			quiz.nextQuestion();
		} catch (error) {
			switch (error.name) {
				case 'NoMoreQuestionsError':
					quiz.stuurRanglijst();
					break;
				default:
					return fn(error);
			}
		}
	});

	socket.on('stuur-antwoord', function (options, fn) {
		console.log('stuur-antwoord', options);
		if (!playerController.isLoggedIn(socket)) {
			return fn({message: 'Niet ingelogd.'});
		}

		var player = playerController.get(socket);
		var quiz = player.quiz;
		if (!quiz.isVraagActief()) {
			return fn({ message: 'De beschikbare tijd om te antwoorden is verlopen.' });
		}
		player.addAntwoord(options.vraagId, options.antwoord);

		quiz.quizMaster.socket.emit('antwoord-geselecteerd', {
			socketId: player.socket.id,
			naam: player.naam,
			antwoord: options.antwoord
		});
	});
});

httpServer.listen(3000, function () {
	console.log("Server running on port 3000.");
});

