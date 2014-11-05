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
			socket.on(eventName, function () {
				var args = arguments;
				$rootScope.$apply(function () {
					callback.apply(socket, args);
				});
			});
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
		templateUrl: 'templates/student/aanmelden.html',
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
	}).when('/docent/vraag/:collectieId/:vraagId', {
		templateUrl: 'templates/docent/vraag.html',
		controller: 'docentVraagCtrl'
	}).when('/docent/vraag-resulaten/:collectieId/:vraagId', {
		templateUrl: 'templates/docent/vraag-resulaten.html',
		controller: 'docentVraagResultatenCtrl'
	}).when('/link', {
		templateUrl: 'templates/docent/link.html'
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
		vragen: null,
		rangLijst: null,
		deelnemers: null
	};
});

app.controller('docentLoginCtrl', function ($scope, $location, socketIO) {
	$scope.loginDocent = function () {
		socketIO.emit("account-sign-in", {
			username: $scope.username,
			password: $scope.password
		});
	};
	socketIO.on("account-sign-in-success", function (username) {
		$scope.naam = username;
		$location.path('/docent/collecties');
	});
	socketIO.on("account-sign-in-error", function () {
		alert('Helaas. :( De opgevoerde gebruikersnaam en wachtwoord zijn niet correct.');
		$scope.password = '';
	});
});

app.controller('studentLoginCtrl', function ($scope, $location, socketIO) {
	$scope.loginStudent = function () {
		socketIO.emit('player-sign-in', {
			username: $scope.naam,
			quizId: $scope.token
		}, function (error) {
			if (error) {
				alert(error.message);
			}
		});
	};
	socketIO.on('player-sign-in-success', function (username) {
		$scope.naam = username;
		$location.path('/wachten');
	});
});

/**
 * Main controller, always initialized
 */
app.controller('initCtrl', function ($scope, VarService) {

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

	VarService.deelnemers = [
		{id: 1, naam: 'Dwayne'},
		{id: 2, naam: 'Martijn'},
		{id: 3, naam: 'Dwayne'},
		{id: 4, naam: 'Dwayne'},
		{id: 5, naam: 'Martijn'},
		{id: 6, naam: 'Dwayne'},
		{id: 7, naam: 'Dwayne'},
		{id: 8, naam: 'Martijn'},
		{id: 9, naam: 'Dwayne'}
	];

	VarService.collecties = [
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
	$scope.vragen = VarService.vragen;

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
			throw new Error(error.message);
		}
	});

	socketIO.on('collections-update', function (receivedCollecties) {
		$scope.collecties = receivedCollecties;
		VarService.collecties = receivedCollecties;
	});

});

/**
 * Collecties controller
 */
app.controller('collectieCtrl', function ($rootScope, $scope, $routeParams, VarService, $window, socketIO) {
	$scope.id = $routeParams.id;
	$scope.newQuestion = false;
	$scope.newAnswer = false;

	/**
	 * Hier moet een url genereert worden
	 * @type {string}
	 */
	$scope.popUpUrl = '#/student';

	$scope.vragen = VarService.collecties[$routeParams.id - 1].vragen;
	$scope.antwoorden = false;

	$scope.addQuestion = function (collectie_id, newQuestionInput) {
		$scope.newQuestion = false;
		if (newQuestionInput.length > 0) {
			VarService.collecties[$routeParams.id - 1].vragen.push({
				id: getNewId(),
				vraag: newQuestionInput,
				visible: true,
				antwoorden: [
					{id: 0, antwoord: 'Antwoord 1', score: 0},
					{id: 1, antwoord: 'Antwoord 2', score: 5},
					{id: 2, antwoord: 'Antwoord 3', score: 10}
				]
			});
		}
		$scope.newQuestionInput = '';
	};

	$scope.resetForm = function () {
		$scope.newQuestion = false;
		$scope.newQuestionInput = '';
	};

	$scope.deleteQuestion = function (index) {
		VarService.collecties[$routeParams.id - 1].vragen.splice(index, 1);
	};

	$scope.openStudentLink = function () {
		$window.open('#/link');
		socketIO.emit('open-quiz');
	};

	$scope.changeVisbility = function (index) {
		if (VarService.collecties[$routeParams.id - 1].vragen[index].visible) {
			VarService.collecties[$routeParams.id - 1].vragen[index].visible = false;
		} else {
			VarService.collecties[$routeParams.id - 1].vragen[index].visible = true;
		}
	};

	$scope.toggleAddAnswer = function (questionIndex) {
		if ($scope.newAnswer) {
			$scope.newAnswer = false;
			$scope.antwoorden = false;
			$scope.vraagTitle = false;
		} else {
			$scope.vraagTitle = VarService.collecties[$routeParams.id - 1].vragen[questionIndex].vraag;
			$scope.antwoorden = VarService.collecties[$routeParams.id - 1].vragen[questionIndex].antwoorden;
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
		var tmp_array = new Array();
		for (i = 0; i < VarService.collecties[$routeParams.id - 1].vragen.length; i++) {
			tmp_array.push(VarService.collecties[$routeParams.id - 1].vragen[i].id);
		}
		return Math.max.apply(Math, tmp_array) + 1;
	}

	$scope.getCollectionName = function (collectie_id) {
		var name = false;
		for (i = 0; i < VarService.collecties.length; i++) {
			if (VarService.collecties[i].id == collectie_id) {
				name = VarService.collecties[i].naam;
			}
		}
		return name;
	}

});

/**
 * Deelnemers controller
 */
app.controller('deelnemersCtrl', function ($rootScope, $scope, VarService) {
	$scope.deelnemers = VarService.deelnemers;
});

/**
 * Docent vraag controller
 */
app.controller('docentVraagCtrl', function ($rootScope, $scope, $routeParams, VarService, $location) {
	$scope.collectieId = $routeParams.collectieId;
	$scope.vraagId = $routeParams.vraagId;
	$scope.antwoorden = VarService.collecties[$scope.collectieId - 1].vragen[$scope.vraagId - 1].antwoorden;
	$scope.vraag = VarService.collecties[$scope.collectieId - 1].vragen[$scope.vraagId - 1].vraag;
	$scope.processTime = 10; // In seconds
	$scope.processBar = 100;
	$scope.nextButton = false;

	if ($scope.vraagId == VarService.collecties[$scope.collectieId - 1].vragen.length) {
		$scope.nextButtonText = 'Bekijk resulaten';
	} else {
		$scope.nextButtonText = 'Volgende vraag';
	}

	$scope.nextQuestion = function () {
		if ($scope.vraagId == VarService.collecties[$scope.collectieId - 1].vragen.length) {
			console.log('einde');
			$location.path('/docent/vraag-resulaten/' + $scope.collectieId + '/1');
		} else {
			$scope.vraagId++;
			$location.path('/docent/vraag/' + $scope.collectieId + '/' + $scope.vraagId);
		}
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
 * Docent vraag controller
 */
app.controller('docentVraagCtrl', function ($rootScope, $scope, $routeParams, VarService, $location) {
	$scope.collectieId = $routeParams.collectieId;
	$scope.vraagId = $routeParams.vraagId;
	$scope.antwoorden = VarService.collecties[$scope.collectieId - 1].vragen[$scope.vraagId - 1].antwoorden;
	$scope.vraag = VarService.collecties[$scope.collectieId - 1].vragen[$scope.vraagId - 1].vraag;
	$scope.processTime = 10; // In seconds
	$scope.processBar = 100;
	$scope.nextButton = false;

	if ($scope.vraagId == VarService.collecties[$scope.collectieId - 1].vragen.length) {
		$scope.nextButtonText = 'Bekijk resulaten';
	} else {
		$scope.nextButtonText = 'Volgende vraag';
	}

	$scope.nextQuestion = function () {
		if ($scope.vraagId == VarService.collecties[$scope.collectieId - 1].vragen.length) {
			console.log('einde');
			$location.path('/docent/vraag-resulaten/' + $scope.collectieId + '/1');
		} else {
			$scope.vraagId++;
			$location.path('/docent/vraag/' + $scope.collectieId + '/' + $scope.vraagId);
		}
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
 * Docent vraag resultaten controller
 */
app.controller('docentVraagResultatenCtrl', function ($rootScope, $scope, $routeParams, VarService, $location) {

	$scope.collectieId = $routeParams.collectieId;
	$scope.vraagId = $routeParams.vraagId;
	$scope.antwoorden = VarService.collecties[$scope.collectieId - 1].vragen[$scope.vraagId - 1].antwoorden;
	$scope.vraag = VarService.collecties[$scope.collectieId - 1].vragen[$scope.vraagId - 1].vraag;

	if ($scope.vraagId == VarService.collecties[$scope.collectieId - 1].vragen.length) {
		$scope.nextButtonText = 'Bekijk resulaten';
	} else {
		$scope.nextButtonText = 'Volgende vraag';
	}

	$scope.nextQuestion = function () {
		if ($scope.vraagId == VarService.collecties[$scope.collectieId - 1].vragen.length) {
			$location.path('/docent/ranglijst');
		} else {
			$scope.vraagId++;
			$location.path('/docent/vraag-resulaten/' + $scope.collectieId + '/' + $scope.vraagId);
		}
	};

});
