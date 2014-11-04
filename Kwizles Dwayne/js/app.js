/**
 * Init our angular app.
 * @type {module|*}
 */
var kwizlesApp = angular.module('kwizles', ['ngRoute', 'ui']);

/**
 * Our angular routes
 */
kwizlesApp.config(['$routeProvider',
    function ($routeProvider) {
        $routeProvider.
            when('/student', {
                templateUrl: 'views/student.html'
            }).
            when('/student/link', {
                templateUrl: 'views/student_link.html'
            }).
            when('/student/wachten', {
                templateUrl: 'views/student_wachten.html'
            }).
            when('/student/vraag/:vraagNummer', {
                templateUrl: 'views/student_vraag.html',
                controller: 'studentVraagCtrl'
            }).
            when('/student/ranglijst', {
                templateUrl: 'views/student_ranglijst.html',
                controller: 'studentRanglijstCtrl'
            }).
            when('/docent', {
                templateUrl: 'views/docent.html'
            }).
            when('/docent/collecties', {
                templateUrl: 'views/collecties.html',
                controller: 'collectiesCtrl'
            }).
            when('/docent/collectie/:id', {
                templateUrl: 'views/collectie.html',
                controller: 'collectieCtrl'
            }).
            otherwise({
                redirectTo: '/'
            });
    }]);

/**
 * Global vars
 */
kwizlesApp.factory('VarService', function () {
    return {
        collecties: null,
        vragen: null,
        rangLijst: null
    };
});

/**
 * Main controller, always initialized
 */
kwizlesApp.controller('initCtrl', function ($scope, VarService) {

    VarService.collecties = [
        {id: 1, naam: 'AJAX'},
        {id: 2, naam: 'HTML 5'},
        {id: 3, naam: 'CSS 3'},
        {id: 4, naam: 'PHP'}
    ];

    VarService.vragen = [
        {collectie_id: 1, id: 0, vraag: 'Waar staat AJAX voor?', visible: true},
        {collectie_id: 1, id: 1, vraag: 'Waar zou AJAX handig voor zijn?', visible: false},
        {collectie_id: 1, id: 2, vraag: 'Waar is AJAX niet goed voor?', visible: true},
        {collectie_id: 2, id: 3, vraag: 'Waar staat HTML 5 voor?', visible: true},
        {collectie_id: 2, id: 4, vraag: 'Waar zou HTML 5 handig voor zijn?', visible: false},
        {collectie_id: 2, id: 5, vraag: 'Waar is HTML 5 niet goed voor?', visible: true},
        {collectie_id: 3, id: 6, vraag: 'Waar staat CSS 3 voor?', visible: true},
        {collectie_id: 3, id: 7, vraag: 'Waar zou CSS 3 handig voor zijn?', visible: true},
        {collectie_id: 3, id: 8, vraag: 'Waar is CSS 3 niet goed voor?', visible: true},
        {collectie_id: 4, id: 9, vraag: 'Waar staat PHP voor?', visible: true},
        {collectie_id: 4, id: 10, vraag: 'Waar zou PHP handig voor zijn?', visible: false},
        {collectie_id: 4, id: 11, vraag: 'Waar is PHP niet goed voor?', visible: true}
    ];

    /**
     * TODO: antwoorden komen in de vragen array
     * @type {{collectie_id: number, id: number, antwoord: string, waar: string}[]}
     */
    VarService.antwoorden = [
        {collectie_id: 1, id: 0, antwoord: 'Antwoord 1', waar: 'true'},
        {collectie_id: 1, id: 1, antwoord: 'Antwoord 2', waar: 'false'},
        {collectie_id: 1, id: 2, antwoord: 'Antwoord 3', waar: 'false'},
        {collectie_id: 2, id: 3, antwoord: 'Antwoord 1', waar: 'false'},
        {collectie_id: 2, id: 4, antwoord: 'Antwoord 2', waar: 'true'},
        {collectie_id: 2, id: 5, antwoord: 'Antwoord 3', waar: 'false'},
        {collectie_id: 3, id: 6, antwoord: 'Antwoord 1', waar: 'true'},
        {collectie_id: 3, id: 7, antwoord: 'Antwoord 2', waar: 'false'},
        {collectie_id: 3, id: 8, antwoord: 'Antwoord 3', waar: 'false'},
        {collectie_id: 4, id: 9, antwoord: 'Antwoord 1', waar: 'true'},
        {collectie_id: 4, id: 10, antwoord: 'Antwoord 2', waar: 'false'},
        {collectie_id: 4, id: 11, antwoord: 'Antwoord 3', waar: 'false'}
    ];

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
kwizlesApp.controller('studentVraagCtrl', function ($rootScope, $scope, $routeParams, VarService) {

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
kwizlesApp.controller('studentRanglijstCtrl', function ($rootScope, $scope, VarService) {

    $scope.rangLijst = VarService.rangLijst;

});

/**
 * Collecties controller
 */
kwizlesApp.controller('collectiesCtrl', function ($rootScope, $scope, VarService) {

    $scope.collecties = VarService.collecties;

    // Private function
    $scope.countQuestionInCollection = function(collectie_id) {
        var tmp_array = new Array();
        for (i = 0; i < VarService.vragen.length; i++) {
            if (VarService.vragen[i].collectie_id == collectie_id) {
                tmp_array.push(i);
            }
        }
        return tmp_array.length;
    }

});

/**
 * Collecties controller
 */
kwizlesApp.controller('collectieCtrl', function ($rootScope, $scope, $routeParams, VarService, $window) {

    $scope.id = $routeParams.id;
    $scope.newQuestion = false;

    /**
     * Hier moet een url genereert worden
     * @type {string}
     */
    $scope.popUpUrl = '#/student';

    $scope.vragen = VarService.vragen;

    $scope.addQuestion = function (collectie_id, newQuestionInput) {
        $scope.newQuestion = false;
        if (newQuestionInput.length > 0) {
            VarService.vragen.push({collectie_id: collectie_id, id: getNewId(), vraag: newQuestionInput, visible: true});
        }
        $scope.newQuestionInput = '';
    };

    $scope.resetForm = function () {
        $scope.newQuestion = false;
        $scope.newQuestionInput = '';
    };

    $scope.deleteQuestion = function (index) {
        console.log(index);
        VarService.vragen.splice(index, 1)

    };

    $scope.openStudentLink = function(){
        $window.open('#/student/link');
    };

    // Private function
    function getNewId() {
        var tmp_array = new Array();
        for (i = 0; i < VarService.vragen.length; i++) {
            tmp_array.push(VarService.vragen[i].id);
        }
        return Math.max.apply(Math, tmp_array) + 1;
    }

    $scope.getCollectionName = function(collectie_id) {
        var name = false;
        for (i = 0; i < VarService.collecties.length; i++) {
            if (VarService.collecties[i].id == collectie_id) {
                name = VarService.collecties[i].naam;
            }
        }
        return name;
    }

});
