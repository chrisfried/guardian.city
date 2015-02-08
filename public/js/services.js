'use strict';

angular.module('heists.services', [])
  .factory('GameService', function($http) {
    var s4 = function() {
      return Math.floor(Math.random() * 0x10000).toString();
    }
    var guid = function(){
      return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
    };
    var pId = guid();

    return {
      playerName: '',
      playerId : pId,
      newGameId : guid(),
      currentGameId: undefined,
      initName: function() {
        if(this.playerName.length === 0) {
            this.playerName = 'anonymous ' + s4();
        }
      },
      getGames: function() {
        return $http.get('/list');
      },
      createGame: function() {
        return $http.post('/add', { id: guid(), name: this.playerName + "'s game" });
      },
      joinGame: function(gameId, playerId, name) {
        return $http.post("/joinGame", { gameId: gameId, playerId: playerId, playerName: name });
      },
      departGame: function(gameId, playerId) {
        $http.post('/departGame', { gameId: gameId, playerId: playerId});
      },
      startGame: function(gameId){
        $http.post("/startGame", { gameId: gameId});
      },
      ready: function(gameId, playerId) {
        $http.post('/ready', { gameId: gameId, playerId: playerId});
      },
      toggleTeam: function(gameId, playerId) {
        $http.post('/toggleTeam', { gameId: gameId, playerId: playerId});
      },
      teamVote: function(gameId, playerId, vote) {
        $http.post('/teamVote', { gameId: gameId, playerId: playerId, vote: vote});
      },
      heistVote: function(gameId, playerId, vote) {
        $http.post('/heistVote', { gameId: gameId, playerId: playerId, vote: vote});
      },
      lastDitch: function(gameId, playerId) {
        $http.post('/lastDitch', { gameId: gameId, playerId: playerId});
      },
    }
  });
