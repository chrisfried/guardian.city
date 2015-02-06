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
    };

    $scope.joinGame = function(gameId) {
      console.info('joinGame called for gameId ' + gameId);
      GameService.initName();
      $location.url("/game/"+ gameId + "/pId/" + GameService.playerId + "/name/" + GameService.playerName);
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

    var socket = io.connect();;

    $scope.game = {};
    $scope.seat = {};
    $scope.progStyle = {width: '0%'};
    $scope.gameId = $routeParams.gameId;
    $scope.playerId = $routeParams.playerId;
    $scope.gameError;

    GameService.playerName = $routeParams.playerName;

    //ng-show helper functions
    $scope.showNotificationLeader = function() {
      return $scope.seat.isLeader
    };
    //end ng-show helper functions

    $scope.selectCard = function(card) {
      GameService.selectCard($scope.gameId, $scope.playerId, card);
    };

    $scope.getCardClass = function(card) {
      if(card === $scope.seat.selectedWhiteCardId) {
        return 'whiteCard whiteCardSelect btn-primary'
      } else {
        return 'whiteCard whiteCardSelect'
      }
    };

    $scope.getButtonText = function(card) {
      if(card === $scope.seat.selectedWhiteCardId) {
        return 'selected'
      } else {
        return 'select'
      }
    };

    $scope.selectWinner = function(card) {
        GameService.selectWinner($scope.gameId, card);
    };

    $scope.getWinningCardClass = function(card) {
      if(card === $scope.game.winningCardId){
        return 'alert alert-success'
      } else {
        return ''
      }
    };

    $scope.readyForNextRound = function() {
      GameService.readyForNextRound($scope.gameId, $scope.playerId);
    };

    function setProgStyle() {
      if($scope.game){
        var playersWaiting = _.reduce($scope.game.seats, function(total, player) {
          if(player.selectedWhiteCardId){return total + 1}
          else{ return total}
        }, 0);
        //this extra addition brings the progress bar to 100% when the game is ready for review
        if($scope.game.isReadyForReview){
          playersWaiting += 1;
        }
        $scope.progStyle = {width: ((playersWaiting / $scope.game.seats.length) * 100)  + '%'};
      }
    };

    function renderGame(game) {
      $scope.game = game;
      $scope.seat = _.find(game.seats, function(seat) {
        return seat.playerId === $scope.playerId;
      });
      setProgStyle();
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
    var socket;

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
      socket = io.connect('/lobby');
      if(socket.connected){
        $scope.getGames();
      }
      socket.on('connect', function() {
        console.info('lobby socket connect');
      });

      socket.on('lobbyJoin', function(gameList) {
        console.info('lobbySocket: lobbyJoin');
        $scope.availableGames = gameList;
        $scope.$apply();
      });

      socket.on('gameAdded', function(gameList) {
        console.info('gameAdded');
        console.info(gameList);
        $scope.availableGames = gameList;
        $scope.$apply();
      });
    }
    initSocket();
    $scope.$emit('enterLobby');
  });
