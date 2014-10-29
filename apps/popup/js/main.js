var app = angular.module("kwizlesPopup", ["ngRoute"]);

app.config(function ($routeProvider) {
	$routeProvider.when('/url/:param', {
		templateUrl: 'templates/appStudentLink.html',
		controller: 'appStudentLinkController'
	});
});

app.controller("appStudentLinkController", function ($scope, $routeParams) {
	$scope.url = $routeParams.param;
	$scope.qrcode = "test1";
});
