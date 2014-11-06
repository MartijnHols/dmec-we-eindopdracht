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

app.controller('studentLoginCtrl', function ($scope, $location, socketIO, $routeParams) {
	$scope.quizPass = $routeParams.quizPass;
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

	$scope.$on('$destroy', function () {
		socketIO.off('player-sign-in-success');
	});
});

/**
 * Main controller, always initialized
 */
app.controller('initCtrl', function ($scope, VarService, $location, $routeParams) {
	VarService.rangLijst = [
		{positie: 1, naam: 'Dwayne', score: '8/8'},
		{positie: 2, naam: 'Martijn', score: '8/8'},
		{positie: 3, naam: 'Dwayne', score: '7/8'},
		{positie: 4, naam: 'Martijn', score: '6/8'},
		{positie: 5, naam: 'Dwayne', score: '5/8'},
		{positie: 6, naam: 'Martijn', score: '4/8'},
		{positie: 7, naam: 'Dwayne', score: '0/8'},
		{positie: 8, naam: 'Martijn', score: '0/8'}
	];
});

/**
 * Studenten vraag controller
 */
app.controller('studentVraagCtrl', function ($rootScope, $scope, $routeParams, VarService) {
	/**
	 * TODO: Hier moet nog een controle komen op welke collectie gekozen is door
	 * de leraar.
	 */
	$scope.vraagNummer = $routeParams.vraagNummer;
	$scope.vraag = VarService.vraag;
});

/**
 * Studenten ranglijst controller
 */
app.controller('studentRanglijstCtrl', function ($rootScope, $scope, VarService) {
	$scope.rangLijst = VarService.rangLijst;
});

/**
 * Collecties controller
 */
app.controller('collectiesCtrl', function ($rootScope, $scope, socketIO, VarService) {
	socketIO.emit('get-collections', null, function (error) {
		if (error) {
			if(error.message == 'Niet ingelogd'){
				$location.path('/');
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
app.controller('collectieCtrl', function ($rootScope, $scope, $routeParams, VarService, $window, socketIO) {

	if(!VarService.collecties){
		$location.path('/docent/login');
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
	};

	socketIO.on('quiz-opened', function (quizId) {
		VarService.quizId = quizId;
		$window.open('#/link/' + quizId);
		$scope.deelnemersBtn = true;
	});

	$scope.$on('$destroy', function () {
		socketIO.off('quiz-opened');
	});

	$scope.changeVisbility = function (index) {
		if (VarService.collecties[$routeParams.id].vragen[index].visible) {
			VarService.collecties[$routeParams.id].vragen[index].visible = false;
		} else {
			VarService.collecties[$routeParams.id].vragen[index].visible = true;
		}
	};

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

/**
 * Deelnemers controller
 */
app.controller('deelnemersCtrl', function ($rootScope, $scope, $location, VarService, socketIO) {
	socketIO.emit('get-deelnemers');
	socketIO.on('deelnemers-update', function (deelnemers) {
		$scope.deelnemers = deelnemers;
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
		});
	};
	socketIO.on('nieuwe-vraag', function (options) {
		VarService.vraagNr = options.vraagNr;
		VarService.aantalVragen = options.aantalVragen;
		VarService.vraag = options.vraag;
		$location.path('/docent/vraag/' + options.vraagNr);
	});

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
	$scope.vraagNr = VarService.vraagNr;
	$scope.vraag = VarService.vraag;

	console.log($scope.vraag);

	$scope.processTime = 10; // In seconds
	$scope.processBar = 100;
	$scope.nextButton = false;

	if ($scope.vraagNr == VarService.aantalVragen) {
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
					return fn(error);
			}
		});
	};

	// Private functions
	var updateBar = function () {
		$scope.$apply(function () {
			if ($scope.processTime >= 0) {
				var tmp_var = ($scope.processTime * 1000) / 100;
				$scope.processBar = tmp_var;
				$scope.processTime -= 0.1;
			} else {
				$scope.nextButton = true;
			}
		});
	};

	setInterval(updateBar, 100);
});

/**
 * Docent ranglijst controller
 */
app.controller('docentRanglijstCtrl', function ($rootScope, $scope, $routeParams, VarService, socketIO) {
	socketIO.on('ranglijst', function (ranglijst) {
		$scope.rangLijst = ranglijst;
	});

	$scope.$on('$destroy', function () {
		socketIO.off('ranglijst');
	});
});
