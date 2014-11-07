/**
 * Init our angular app.
 * @type {module|*}
 */
var app = angular.module('kwizles', ['ngRoute', 'ui']);

// This factory is useful in other applications that use AngularJS with
// Socket.IO 1.0 (or higher) and Express 4.
// It is adapted from http://briantford.com/blog/angular-socket-io,
// and an extended version can be found here: https://github.com/btford/angular-socket-io
// (although I don't know if that version works with Express 4 and SocketIO 1.0)

app.factory('socketIO', function ($rootScope) {
	var socket = io();
	socket.on("connect", function () {
		console.log("connected", socket.io.engine.id);
	});
	return {
		on: function (eventName, callback) {
			console.log('bind "' + eventName + '"');
			return socket.on(eventName, function () {
				console.log(eventName);
				var args = arguments;
				$rootScope.$apply(function () {
					callback.apply(socket, args);
				});
			});
		},
		off: function (eventName) {
			return socket.off(eventName);
		},
		emit: function (eventName, data, callback) {
			console.log(eventName, data);
			socket.emit(eventName, data, function () {
				var args = arguments;
				$rootScope.$apply(function () {
					if (callback) {
						callback.apply(socket, args);
					}
				});
			})
		},
		id: function () {
			return socket.io.engine.id
		}
	};
});
// end of Socket.IO service for AngularJS

/**
 * Our angular routes
 */
app.config(['$routeProvider', function ($routeProvider) {
	$routeProvider.when('/', {
		templateUrl: 'templates/student/login.html',
		controller: 'studentLoginCtrl'
	}).when('/login/:quizPass', {
		templateUrl: 'templates/student/login.html',
		controller: 'studentLoginCtrl'
	}).when('/wachten', {
		templateUrl: 'templates/student/wachten.html'
	}).when('/vraag/:vraagNummer', {
		templateUrl: 'templates/student/vraag.html',
		controller: 'studentVraagCtrl'
	}).when('/ranglijst', {
		templateUrl: 'templates/student/ranglijst.html',
		controller: 'studentRanglijstCtrl'
	}).when('/docent', {
		templateUrl: 'templates/docent/login.html',
		controller: 'docentLoginCtrl'
	}).when('/docent/collecties', {
		templateUrl: 'templates/docent/collecties.html',
		controller: 'collectiesCtrl'
	}).when('/docent/collectie/:id', {
		templateUrl: 'templates/docent/collectie.html',
		controller: 'collectieCtrl'
	}).when('/docent/deelnemers', {
		templateUrl: 'templates/docent/deelnemers.html',
		controller: 'deelnemersCtrl'
	}).when('/docent/vraag/:vraagId', {
		templateUrl: 'templates/docent/vraag.html',
		controller: 'docentVraagCtrl'
	}).when('/docent/ranglijst', {
		templateUrl: 'templates/docent/ranglijst.html',
		controller: 'docentRanglijstCtrl'
	}).when('/link/:quizId', {
		templateUrl: 'templates/docent/link.html',
		controller: 'linkCtrl'
	}).otherwise({
		redirectTo: '/'
	});
}]);

/**
 * Global vars
 */
app.factory('VarService', function () {
	return {
		collecties: null,
		vraag: null,
		vraagNr: 0,
		rangLijst: null,
		quizId: null,
		collectieId: null
	};
});

app.controller('linkCtrl', function ($scope, $routeParams) {
	$scope.link = location.protocol + '//' + location.host + '/#/login/' + $routeParams.quizId;
	$scope.qrCode = 'https://chart.googleapis.com/chart?cht=qr&chs=500x500&chl=' + encodeURIComponent(location.protocol + '//' + location.host + '/#/login/' + $routeParams.quizId);

});

app.controller('docentLoginCtrl', function ($scope, $location, socketIO, VarService) {
	$scope.loginError = false;
	$scope.loginMessage = 'De opgegeven gebruikersnaam of wachtwoord zijn niet correct, probeer opnieuw.';

	$scope.loginDocent = function () {
		socketIO.emit("account-sign-in", {
			username: $scope.username,
			password: $scope.password
		});
	};

	socketIO.on("account-sign-in-success", function (username) {
		$scope.naam = username;
		VarService.isLoggedIn = true;
		$location.path('/docent/collecties');
	});

	socketIO.on("account-sign-in-error", function () {
		$scope.password = '';
		$scope.loginError = true;
		VarService.isLoggedIn = false;
	});

	$scope.$on('$destroy', function () {
		socketIO.off('account-sign-in-success');
		socketIO.off('account-sign-in-error');
	});
});

var studentEventsBound = false;
app.controller('studentLoginCtrl', function ($scope, $location, socketIO, $routeParams, VarService) {
	$scope.token = $routeParams.quizPass;
	$scope.loginError = false;

	$scope.loginStudent = function () {
		socketIO.emit('player-sign-in', {
			naam: $scope.naam,
			quizId: $scope.token
		}, function (error) {
			if (error) {
				$scope.loginError = true;
				$scope.loginMessage = error.message;
			}
		});
	};

	socketIO.on('player-sign-in-success', function (username) {
		$scope.naam = username;
		$location.path('/wachten');
	});
	if (!studentEventsBound) {
		socketIO.on('nieuwe-vraag', function (options) {
			console.log('Vraag #' + options.vraagNr + ' ontvangen: ' + options.vraag.vraag, options);
			VarService.vraagNr = options.vraagNr;
			VarService.aantalVragen = options.aantalVragen;
			VarService.vraag = options.vraag;
			$location.path('/vraag/' + options.vraagNr);
		});
		socketIO.on('ranglijst', function (ranglijst) {
			VarService.rangLijst = ranglijst;
			$location.path('/ranglijst');
		});
		socketIO.on('quiz-end', function () {
			$location.path('/');
		});
		studentEventsBound = true;
	}

	$scope.$on('$destroy', function () {
		socketIO.off('player-sign-in-success');
	});
});

/**
 * Studenten vraag controller
 */
app.controller('studentVraagCtrl', function ($rootScope, $scope, $routeParams, VarService, socketIO, $location) {
	if (!VarService.vraag) {
		$location.path('/');
		return;
	}
	$scope.vraagNummer = VarService.vraagNr;
	$scope.vraag = VarService.vraag;
	$scope.processTimeUp = false;

	$scope.selecteerAntwoord = function (antwoord) {
		if (!$scope.processTimeUp) {
			$scope.geselecteerdAntwoord = antwoord.id;
			socketIO.emit('stuur-antwoord', {
				vraagId: VarService.vraag.id,
				antwoord: antwoord
			}, function (error) {
				if (error) {
					throw new Error(error.message);
					//TODO: Als tijd is verstreken een nette foutmelding geven en niet overgeven
				}
			});
		}
	};

	var questionStart = +new Date();
	var questionTime = 10;
	$scope.processBar = 100;
	var tmrProgressBar = setInterval(function () {
		$scope.$apply(function () {
			var now = +new Date();
			var timePassed = (now - questionStart) / 1000;
			var timeLeft = questionTime - timePassed;
			if (timePassed < questionTime) {
				$scope.processBar = (timeLeft * 1000) / 100;
			} else {
				clearInterval(tmrProgressBar);
				$scope.processTimeUp = true;
				$scope.processBar = 0;
			}
		});
	}, 100);
	$scope.randomSort = function (vraag) {
		return Math.random();
	};
});

/**
 * Studenten ranglijst controller
 */
app.controller('studentRanglijstCtrl', function ($rootScope, $scope, VarService, $location) {
	if (!VarService.rangLijst) {
		$location.path('/');
		return;
	}
	$scope.rangLijst = VarService.rangLijst;
});

/**
 * Collecties controller
 */
app.controller('collectiesCtrl', function ($rootScope, $scope, socketIO, VarService, $location) {
	socketIO.emit('get-collections', null, function (error) {
		if (error) {
			if (error.message == 'Niet ingelogd') {
				$location.path('/docent');
				return;
			}
			throw new Error(error.message);
		}
	});

	socketIO.on('collections-update', function (receivedCollecties) {
		$scope.collecties = receivedCollecties;
		VarService.collecties = receivedCollecties;
	});

	$scope.$on('$destroy', function () {
		socketIO.off('collections-update');
	});
});

/**
 * Collecties controller
 */
app.controller('collectieCtrl', function ($rootScope, $scope, $routeParams, VarService, $window, socketIO, $location) {
	if (!VarService.collecties) {
		$location.path('/docent');
		return;
	}

	$scope.id = $routeParams.id;
	VarService.collectieId = $routeParams.id;
	$scope.newQuestion = false;
	$scope.newAnswer = false;
	$scope.deelnemersBtn = false;

	$scope.vragen = VarService.collecties[$routeParams.id].vragen;
	$scope.antwoorden = false;

	$scope.addQuestion = function (collectie_id, newQuestionInput) {
		$scope.newQuestion = false;
		if (newQuestionInput.length > 0) {
			var newId = getNewId();
			VarService.collecties[$routeParams.id].vragen[newId] = {
				id: newId,
				vraag: newQuestionInput,
				visible: true,
				antwoorden: [
					{id: 0, antwoord: 'Antwoord 1', score: 0},
					{id: 1, antwoord: 'Antwoord 2', score: 5},
					{id: 2, antwoord: 'Antwoord 3', score: 10}
				]
			};
		}
		$scope.newQuestionInput = '';
	};

	$scope.resetForm = function () {
		$scope.newQuestion = false;
		$scope.newQuestionInput = '';
	};

	$scope.deleteQuestion = function (index) {
		VarService.collecties[$routeParams.id].vragen.splice(index, 1);
	};

	$scope.openStudentLink = function () {
		socketIO.emit('open-quiz');
		socketIO.on('quiz-end', function () {
			$location.path('/docent/collecties');
		});
	};

	socketIO.on('quiz-opened', function (quizId) {
		VarService.quizId = quizId;
		$window.open('#/link/' + quizId);
		$scope.deelnemersBtn = true;
	});

	$scope.$on('$destroy', function () {
		socketIO.off('quiz-opened');
	});

	$scope.toggleAddAnswer = function (questionIndex) {
		if ($scope.newAnswer) {
			$scope.newAnswer = false;
			$scope.antwoorden = false;
			$scope.vraagTitle = false;
		} else {
			$scope.vraagTitle = VarService.collecties[$routeParams.id].vragen[questionIndex].vraag;
			$scope.antwoorden = VarService.collecties[$routeParams.id].vragen[questionIndex].antwoorden;
			$scope.newAnswer = true;
		}
	};

	$scope.addAnswer = function (newAnswerInput, scoreInput) {
		if (newAnswerInput.length > 0) {
			$scope.antwoorden.push({id: 0, antwoord: newAnswerInput, score: scoreInput});

			$scope.newAnswerInput = '';
			$scope.scoreInput = '';
		}
	};

	$scope.deleteAnswer = function (index) {
		$scope.antwoorden.splice(index, 1);
	};

	// Private function
	function getNewId() {
		var tmp_array = [];
		for (var i = 0; i < VarService.collecties[$routeParams.id].vragen.length; i++) {
			tmp_array.push(VarService.collecties[$routeParams.id].vragen[i].id);
		}
		return Math.max.apply(Math, tmp_array) + 1;
	}

	$scope.getCollectionName = function (collectie_id) {
		return VarService.collecties[collectie_id].naam;
	}
});

var docentEventsBound = false;
/**
 * Deelnemers controller
 */
app.controller('deelnemersCtrl', function ($rootScope, $scope, $location, VarService, socketIO) {
	socketIO.emit('get-deelnemers', null, function (error) {
		if (error) {
			if (error.message == 'Niet ingelogd.') {
				$location.path('/docent');
				return;
			}
			throw new Error(error.message);
		}
	});
	socketIO.on('deelnemers-update', function (deelnemers) {
		VarService.deelnemers = deelnemers;
		$scope.deelnemers = VarService.deelnemers;
	});

	$scope.startQuiz = function () {
		var collectie = VarService.collecties[VarService.collectieId];
		var geselecteerdeVragen = [];
		for (var key in collectie.vragen) {
			var item = collectie.vragen[key];
			if (item.visible) {
				geselecteerdeVragen.push(item);
			}
		}
		socketIO.emit('start-quiz', {
			quizId: VarService.quizId,
			vragen: geselecteerdeVragen
		}, function (error) {
			if (error) {
				alert(error.message);
			}
		});
	};
	if (!docentEventsBound) {
		socketIO.on('nieuwe-vraag', function (options) {
			console.log('Vraag #' + options.vraagNr + ' ontvangen: ' + options.vraag.vraag, options);
			VarService.vraagNr = options.vraagNr;
			VarService.aantalVragen = options.aantalVragen;
			VarService.vraag = options.vraag;
			$location.path('/docent/vraag/' + options.vraagNr);
		});
		docentEventsBound = true;
	}

	$scope.$on('$destroy', function () {
		socketIO.off('deelnemers-update');
		// Niet weghalen aan het einde! De bedoeling is dat er meerdere vragen gevangen worden met deze listener
		//socketIO.off('nieuwe-vraag');
	});
});

/**
 * Docent vraag controller
 */
app.controller('docentVraagCtrl', function ($rootScope, $scope, $routeParams, VarService, $location, socketIO) {
	if (!VarService.vraag) {
		$location.path('/docent');
		return;
	}
	$scope.vraagNr = VarService.vraagNr;
	$scope.vraag = VarService.vraag;
	$scope.vraag = VarService.vraag;
	$scope.deelnemerKeuzes = [];
	for (var key in VarService.deelnemers) {
		var deelnemer = VarService.deelnemers[key];
		$scope.deelnemerKeuzes.push({
			socketId: deelnemer.socketId,
			naam: deelnemer.naam,
			antwoord: null
		});
	}

	if ($scope.vraagNr == VarService.aantalVragen) { // vraagNr telling begint bij 1 i.p.v. 0 dus dit hoort te werken
		$scope.nextButtonText = 'Bekijk resulaten';
	} else {
		$scope.nextButtonText = 'Volgende vraag';
	}

	$scope.nextQuestion = function () {
		socketIO.emit('next-question', null, function (error) {
			switch (error.name) {
				case 'CurrentQuestionTimeError':
					alert('Wacht tot de huidige vraag klaar is.');
					return;
				default:
					throw error;
			}
		});
	};
	socketIO.on('ranglijst', function (ranglijst) {
		VarService.rangLijst = ranglijst;
		$location.path('/docent/ranglijst');
	});
	socketIO.on('antwoord-geselecteerd', function (options) {
		for (var key in $scope.deelnemerKeuzes) {
			var deelnemerKeuze = $scope.deelnemerKeuzes[key];
			if (deelnemerKeuze.socketId === options.socketId) {
				deelnemerKeuze.antwoord = options.antwoord;
			}
		}
	});

	$scope.$on('$destroy', function () {
		socketIO.off('ranglijst');
		socketIO.off('antwoord-geselecteerd');
	});

	var questionStart = +new Date();
	var questionTime = 10;
	$scope.processBar = 100;
	$scope.nextButton = false;
	var tmrProgressBar = setInterval(function () {
		$scope.$apply(function () {
			var now = +new Date();
			var timePassed = (now - questionStart) / 1000;
			var timeLeft = questionTime - timePassed;
			if (timePassed < questionTime) {
				$scope.processBar = (timeLeft * 1000) / 100;
			} else {
				$scope.nextButton = true;
				clearInterval(tmrProgressBar);
				$scope.processBar = 0;
			}
		});
	}, 100);
});

/**
 * Docent ranglijst controller
 */
app.controller('docentRanglijstCtrl', function ($rootScope, $scope, $routeParams, VarService, $location) {
	if (!VarService.rangLijst) {
		$location.path('/docent');
		return;
	}
	$scope.stopQuiz = function () {
		var quizMaster = quizMasterController.get(socket);
		quizMaster.activeQuiz.end();
	};

	$scope.rangLijst = VarService.rangLijst;
});
