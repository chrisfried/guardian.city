'use strict';

angular.module('heists', [
  'ngResource',
  'ngRoute',
  'ngSanitize',
  'heists.services',
  'heists.controllers'
]).
config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/', {templateUrl: 'views/lobby.html', controller:'LobbyCtrl'});
    $routeProvider.when('/game/:gameId/pId/:playerId/name/:playerName', {templateUrl: 'views/game.html', controller: 'GameCtrl'});
    //$routeProvider.otherwise({redirectTo: '/'});
}]);
