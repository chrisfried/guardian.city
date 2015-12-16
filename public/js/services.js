'use strict';

angular.module('heists.services', [])
  .factory('GameService', function($http) {
    var s4 = function() {
      return Math.floor(Math.random() * 0x10000).toString();
    }
    var guid = function(){
      return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
    };
    if (window.localStorage["playerId"]) {
      var playerId = window.localStorage["playerId"];
    } else {
      var playerId = guid();
      window.localStorage["playerId"] = playerId;
    }

    if (window.localStorage["playerName"]) {
      var playerName = window.localStorage["playerName"];
    } else {
      var playerName = '';
    }

    return {
      playerName: playerName,
      playerId : playerId,
      newGameId : guid(),
      currentGameId: undefined,
      initName: function() {
        if(this.playerName.length === 0) {
          if (window.localStorage["playerName"]) {
            this.playerName = window.localStorage["playerName"];
          } else {
            this.playerName = 'anonymous ' + s4();
          }
        }
        window.localStorage["playerName"] = this.playerName;
      },
      getGames: function() {
        return $http.get('/list');
      },
      createGame: function() {
        return $http.post('/add', { id: guid(), name: this.playerName + "'s game" });
        ga('send', 'pageview', '/game/create', {title: 'Create Game'});
      },
      listPrevious: function(gameId) {
        return $http.post("/listPrevious", { gameId: gameId });
      },
      joinGame: function(gameId, playerId, name) {
        return $http.post("/joinGame", { gameId: gameId, playerId: playerId, playerName: name });
        ga('send', 'pageview', '/game/join', {title: 'Join Game'});
      },
      departGame: function(gameId, playerId) {
        $http.post('/departGame', { gameId: gameId, playerId: playerId});
        ga('send', 'pageview', '/game/leave', {title: 'Leave Game'});
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
        ga('send', 'pageview', '/game/approval/' . vote, {title: 'Approval Vote'});
      },
      heistVote: function(gameId, playerId, vote) {
        $http.post('/heistVote', { gameId: gameId, playerId: playerId, vote: vote});
        ga('send', 'pageview', '/game/vote/' . vote, {title: 'Burrito Vote'});
      },
      lastDitch: function(gameId, playerId) {
        $http.post('/lastDitch', { gameId: gameId, playerId: playerId});
        ga('send', 'pageview', '/game/backstab', {title: 'Backstab'});
      },
    }
  });
