
var app = angular.module("angularSocketBlocks",["ngRoute"]);


// This factory is useful in other applications that use AngularJS with
// Socket.IO 1.0 (or higher) and Express 4.
// It is adapted from http://briantford.com/blog/angular-socket-io,
// and an extended version can be found here: https://github.com/btford/angular-socket-io
// (although I don't know if that version works with Express 4 and SocketIO 1.0)


app.factory('socketIO', function ($rootScope) {
  var socket = io();
  socket.on("connect", function() {
     console.log("connected", socket.io.engine.id);
  })
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
    id: function() {
      return socket.io.engine.id
   }
  };
});

// end of Socket.IO service for AngularJS


app.config( function($routeProvider) {

      $routeProvider.
          when('/name', {
              templateUrl: '/templates/nameForm.html',
              controller: 'nameFormController'
          }).
          when('/blocks/:name', {
              templateUrl: '/templates/blocks.html',
              controller: 'blocksController'
          }).
          otherwise({
              redirectTo: '/name'
          });
});


app.controller("nameFormController", function($scope, $location) {

   $scope.userName = "";

   $scope.submitUserName = function() {
      $location.path("/blocks/"+$scope.userName);
   }

});

app.controller("blocksController", function($scope, $routeParams, socketIO) {

   socketIO.emit("sign in", $routeParams.name );

   socketIO.on("sign in reply", function(players){
      console.log("SIGNINREPLY:", players);
      $scope.playerSet = players;
      $scope.player = $scope.playerSet[ socketIO.id() ]; // We're storing the player in an object
                                                         // indexed by socket-id (see server code).
                                                         // We no longer have to rely on the current
                                                         // player being the last player in the array.
   });
   socketIO.on("new player", function(newPlayerInfo){
      $scope.playerSet[newPlayerInfo.socketId] = newPlayerInfo;
   })
   socketIO.on("update other player", function(playerInfo){
      // In class, we used a for-loop to find the player in the array, like this:
         // for( var idx=0; idx< $scope.playerList.length; idx++) {
         //    if( playerInfo.name === $scope.playerList[idx].name ) {
         //       $scope.playerList[idx] = playerInfo;
         //    }
         // }
      // Now, because we use an object to store all players, we just need this:
      $scope.playerSet[playerInfo.socketId] = playerInfo; // similar to "new player" function above
   })
   socketIO.on("player has left", function(id){
      delete $scope.playerSet[id];
   });

   // This is no longer an array. We'll use a JS object where the keys
   // are socket ids, and the values are player-objects.
   // Therefore the name is changed from "playerList" to "playerSet".
   $scope.playerSet = null;
   $scope.player = null;

   $scope.key = function(evt) {
      console.log("KEY:", evt.keyCode);

      var step = 15;

      if( evt.keyCode == 37 ) { //LEFT
         $scope.player.x -= step;
         evt.preventDefault();
      } else if( evt.keyCode == 38 ) { //UP
         $scope.player.y -= step;
         evt.preventDefault();
      } else if( evt.keyCode == 39 ) { //RIGHT
         $scope.player.x += step;
         evt.preventDefault();
      } else if( evt.keyCode == 40 ) { //DOWN
         $scope.player.y += step;
         evt.preventDefault();
      }
      socketIO.emit("update player", $scope.player);
   }
});
