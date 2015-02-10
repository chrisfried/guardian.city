'use strict';

/* Controllers */

angular.module('heists.controllers', [])
  .controller('HomeCtrl', function($scope, $location, GameService) {
    console.info('HomeCtrl loaded');

    var handleError = function(err) {
      console.error(err);
    };

    $scope.gameSvc = GameService;
    $scope.inLobby = true;

    $scope.createGame = function() {
      console.info('createGame called');
      GameService.initName();
      GameService.createGame()
        .then(function(success) {
          //navigate to the new game
          console.info(success);
          $scope.joinGame(success.data.id);
        }, handleError);
      $scope.$apply;
    };

    $scope.joinGame = function(gameId) {
      console.info('joinGame called for gameId ' + gameId);
      GameService.initName();
      $location.url("/game/"+ gameId + "/pId/" + GameService.playerId + "/name/" + GameService.playerName)
        .then(window.location.reload());
    };

    $scope.$on('enterLobby', function() {
      $scope.inLobby = true;
    });

    $scope.$on('enterGame', function() {
      $scope.inLobby = false;
    })

  })
  .controller('GameCtrl', function($scope, $routeParams, GameService){
    console.info('GameCtrl loaded');

    var socket = io.connect();

    $scope.game = {};
    $scope.seat = {};
    $scope.gameId = $routeParams.gameId;
    $scope.playerId = $routeParams.playerId;
    $scope.gameError;

    GameService.playerName = $routeParams.playerName;


    $scope.trackerClass = function(game) {
      if (game.state === 'postGame' && game.minorityVictory) {
        return 'panel-danger';
      } else if (game.state === 'postGame') {
        return 'panel-success';
      } else {
        return 'panel-default';
      }
    }

    $scope.heistClass = function(heist) {
      if (heist.completed) {
        if (heist.heistSuccessful) {
          return 'success';
        } else {
          return 'danger';
        }
      } else {
        return 'default';
      }
    };

    $scope.seatHasVotedClass = function(seat) {
      if (seat.hasTeamVoted) {
        if (seat.teamVote) {
          return 'list-group-item-success';
        } else {
          return 'list-group-item-danger';
        }
      } else {
        return;
      }
    }


    $scope.startGame = function() {
      GameService.startGame($scope.gameId);
    };

    $scope.ready = function() {
      GameService.ready($scope.gameId, $scope.playerId);
    };

    $scope.toggleTeam = function(playerId) {
      GameService.toggleTeam($scope.gameId, playerId);
    }

    $scope.teamVote = function(vote) {
      GameService.teamVote($scope.gameId, $scope.playerId, vote);
    };

    $scope.heistVote = function(vote) {
      GameService.heistVote($scope.gameId, $scope.playerId, vote);
    };

    $scope.lastDitch = function(playerId) {
      GameService.lastDitch($scope.gameId, playerId);
    };

    function renderGame(game) {
      $scope.game = game;
      if (game) {
        $scope.seat = _.find(game.seats, function(seat) {
          return seat.playerId === $scope.playerId;
        });
      }
    };

    function initSocket() {
      socket = io.connect('/', {query: 'playerId=' + $routeParams.playerId});
      if(socket.connected){
        socket.emit('connectToGame', { gameId: $routeParams.gameId, playerId: $routeParams.playerId, playerName: GameService.playerName });
      }
      socket.on('connect', function() {
        console.info('game socket connect');
        socket.emit('connectToGame', { gameId: $routeParams.gameId, playerId: $routeParams.playerId, playerName: GameService.playerName });
      });

      socket.on('updateGame', function(game) {
        console.info('updateGame');
        console.info(game);
        renderGame(game);
        $scope.$apply();
      });

      socket.on('gameError', function(errorMsg) {
        $scope.gameError = errorMsg;
        $scope.$apply();
      });
    }

    function joinGame() {
      GameService.joinGame($routeParams.gameId, $routeParams.playerId, $routeParams.playerName)
        .then(function(success) {
          renderGame(success.data);
          initSocket();
        },
        function(error) {
          $scope.gameError = error.data.error;
        });
    };

    joinGame();
    //initSocket();
    $scope.$emit('enterGame');

    $scope.$on('$destroy', function(event) {
      console.info('leaving GameCtrl');
      if($scope.game){
        GameService.departGame($scope.game.id, $scope.playerId);
      }
    });
  })
  .controller('LobbyCtrl', function($scope, $location, GameService) {
    console.info('LobbyCtrl loaded');
    var lobbySocket;

    $scope.availableGames = [];
    $scope.creatingGame = false;
    $scope.gameSvc = GameService;

    $scope.getGames = function() {
      GameService.getGames()
        .then(function(success) {
          var games = success.data;
          console.info('getGames returned ' + games.length + ' items');
          $scope.availableGames = games;
      });
    };

    function initSocket() {
      lobbySocket = io.connect('/lobby');
      if(lobbySocket.connected){
        $scope.getGames();
      }
      lobbySocket.on('connect', function() {
        console.info('lobby socket connect');
      });

      lobbySocket.on('lobbyJoin', function(gameList) {
        console.info('lobbySocket: lobbyJoin');
        $scope.availableGames = gameList;
        $scope.$apply();
      });

      lobbySocket.on('gameAdded', function(gameList) {
        console.info('gameAdded');
        console.info(gameList);
        $scope.availableGames = gameList;
        $scope.$apply();
      });
    }
    initSocket();
    $scope.$emit('enterLobby');
  });
