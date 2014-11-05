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
    }).when('/docent/vraag/:vraagId/:collectieId', {
        templateUrl: 'templates/docent/vraag.html',
        controller: 'docentVraagCtrl'
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
		socketIO.emit("sign in", {
			username: $scope.username,
			password: $scope.password
		});
	};
	socketIO.on("sign in success", function (username) {
		$scope.naam = username;
		$location.path('/docent/collecties');
	});
	socketIO.on("sign in error", function () {
		alert('Helaas. :( De opgevoerde gebruikersnaam en wachtwoord zijn niet correct.');
		$scope.password = '';
	});
});

app.controller('studentLoginCtrl', function ($scope, $location, socketIO) {
	$scope.loginStudent = function () {
		socketIO.emit("player-sign-in", {
			username: $scope.username,
			quizId: $scope.quizToken
		});
	};
	socketIO.on("sign in success", function (username) {
		$scope.naam = username;
		$location.path('/docent/collecties');
	});
	socketIO.on("sign in error", function () {
		alert('Helaas. :( De opgevoerde gebruikersnaam en wachtwoord zijn niet correct.');
		$scope.password = '';
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
	socketIO.emit('getCollections', null, function (error) {
		if (error) {
			throw new Error(error.message);
		}
	});
	socketIO.on('collectionUpdate', function (receivedCollecties) {
		$scope.collecties = receivedCollecties;
		VarService.collecties = receivedCollecties;
	});
});

/**
 * Collecties controller
 */
app.controller('collectieCtrl', function ($rootScope, $scope, $routeParams, VarService, $window) {
    $scope.id = $routeParams.id;
    $scope.newQuestion = false;

    /**
     * Hier moet een url genereert worden
     * @type {string}
     */
    $scope.popUpUrl = '#/student';

    $scope.vragen = VarService.collecties[$routeParams.id - 1].vragen;

    $scope.addQuestion = function (collectie_id, newQuestionInput) {
        $scope.newQuestion = false;
        if (newQuestionInput.length > 0) {
            VarService.collecties[$routeParams.id - 1].vragen.push({
                id: getNewId(),
                vraag: newQuestionInput,
                visible: true,
                antwoorden: [
                    {id: 0, antwoord: 'Antwoord 1', waar: true},
                    {id: 1, antwoord: 'Antwoord 2', waar: false},
                    {id: 2, antwoord: 'Antwoord 3', waar: false}
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
        $window.open('#/student/link');
    };

    $scope.changeVisbility = function (index) {
        if(VarService.collecties[$routeParams.id - 1].vragen[index].visible){
            VarService.collecties[$routeParams.id - 1].vragen[index].visible = false;
        } else {
            VarService.collecties[$routeParams.id - 1].vragen[index].visible = true;
        }
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
app.controller('docentVraagCtrl', function ($rootScope, $scope, $routeParams, VarService) {

    $scope.collectieId = $routeParams.collectieId;
    $scope.vraagId = $routeParams.vraagId;
    $scope.vragen = VarService.vragen;

});

//app.controller("nameFormController", function ($scope, $location) {
//
//	$scope.userName = "";
//
//	$scope.submitUserName = function () {
//		$location.path("/blocks/" + $scope.userName);
//	}
//
//});
//
//app.controller("blocksController", function ($scope, $routeParams, socketIO) {
//	socketIO.emit("sign in", $routeParams.name);
//
//	socketIO.on("sign in reply", function (players) {
//		console.log("SIGNINREPLY:", players);
//		$scope.playerSet = players;
//		$scope.player = $scope.playerSet[ socketIO.id() ]; // We're storing the player in an object
//		// indexed by socket-id (see server code).
//		// We no longer have to rely on the current
//		// player being the last player in the array.
//	});
//	socketIO.on("new player", function (newPlayerInfo) {
//		$scope.playerSet[newPlayerInfo.socketId] = newPlayerInfo;
//	});
//	socketIO.on("update other player", function (playerInfo) {
//		$scope.playerSet[playerInfo.socketId] = playerInfo;
//	});
//	socketIO.on("player has left", function (id) {
//		delete $scope.playerSet[id];
//	});
//
//	// This is no longer an array. We'll use a JS object where the keys
//	// are socket ids, and the values are player-objects.
//	// Therefore the name is changed from "playerList" to "playerSet".
//	$scope.playerSet = null;
//	$scope.player = null;
//
//	$scope.key = function (evt) {
//		console.log("KEY:", evt.keyCode);
//
//		var step = 15;
//
//		if (evt.keyCode == 37) { //LEFT
//			$scope.player.x -= step;
//			evt.preventDefault();
//		} else if (evt.keyCode == 38) { //UP
//			$scope.player.y -= step;
//			evt.preventDefault();
//		} else if (evt.keyCode == 39) { //RIGHT
//			$scope.player.x += step;
//			evt.preventDefault();
//		} else if (evt.keyCode == 40) { //DOWN
//			$scope.player.y += step;
//			evt.preventDefault();
//		}
//		socketIO.emit("update player", $scope.player);
//	}
//});
