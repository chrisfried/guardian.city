var express = require('express');
var app = express();
var server = require('http').Server(app);
var bodyParser = require('body-parser');
var io = require('socket.io')(server);

var Game = require('./game.js');

server.listen(process.env.PORT || 80);

app.use(bodyParser.json());
app.use('/public', express.static('public'));

function returnGame(gameId, res) { res.json(gameViewModel(gameId)); }

function broadcastGame(gameId) {
  var vm = gameViewModel(gameId);
  io.to(gameId).emit("updateGame", vm);
}

function gameViewModel(gameId) {
  var game = Game.getGame(gameId);
  if (game) {
    var viewModel = JSON.parse(JSON.stringify(game));
    return viewModel;
  }
}

var lobbySocket = io
  .of('/lobby')
  .on('connection', function(socket) {
    var gameList = Game.listAvailable();
    socket.emit('lobbyJoin', gameList);
  });

io.sockets.on('connection', function(socket) {
  socket.on('connectToGame', function(data) {
    var game = Game.getGame(data.gameId);
    if(game){
      socket.gameId = data.gameId;
      socket.playerId = data.playerId;
      socket.join(data.gameId);
      broadcastGame(data.gameId);
    } else {
      socket.emit('gameError', 'Invalid Game ID');
    }
  });

  socket.on('disconnect', function() {
    if(socket.playerId && socket.gameId){
      Game.departGame(socket.gameId, socket.playerId);
      broadcastGame(socket.gameId);
      lobbySocket.emit('gameAdded', Game.listAvailable());
    }
  });
});

app.get('/', function (req, res) { res.sendFile(__dirname + '/views/index.html'); });
app.get('/views/*', function (req, res) { res.sendFile(__dirname + '/views/' + req.params[0]); });
app.get('/list', function (req, res) { res.json(Game.listAvailable()); });
app.get('/listall', function (req, res) { res.json(Game.listAll()); });
app.post('/add', function (req, res) {
  var newGame = Game.addGame(req.body);
  res.json(newGame);
  lobbySocket.emit('gameAdded', Game.listAvailable());
});
app.get('/gamebyid', function (req, res) { res.json(Game.getGame(req.body.gameId)); });

app.post('/listPrevious', function (req, res) {
  res.send(Game.listPrevious(req.body.gameId));
});

app.post('/joinGame', function (req, res) {
  var game = Game.getGame(req.body.gameId);
  if(!game) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.write(JSON.stringify({ error: "invalid GameId" }));
    res.end();
    return null;
  }

  game = Game.joinGame(game, { id: req.body.playerId, name: req.body.playerName });
  returnGame(req.body.gameId, res);
  broadcastGame(req.body.gameId);
  lobbySocket.emit('gameAdded', Game.listAvailable());
});

app.post('/departGame', function(req, res) {
  Game.departGame(req.body.gameId, req.body.playerId);
  lobbySocket.emit('gameAdded', Game.listAvailable());
  broadcastGame(req.body.gameId);
});

app.post('/startGame', function(req, res) {
  Game.startGame(req.body.gameId);
  broadcastGame(req.body.gameId);
  lobbySocket.emit('gameAdded', Game.listAvailable());
  returnGame(req.body.gameId, res);
});

app.post('/ready', function(req, res) {
  Game.ready(req.body.gameId, req.body.playerId);
  broadcastGame(req.body.gameId);
  lobbySocket.emit('gameAdded', Game.listAvailable());
  returnGame(req.body.gameId, res);
});

app.post('/toggleTeam', function(req, res){
  Game.toggleTeam(req.body.gameId, req.body.playerId);
  broadcastGame(req.body.gameId);
  returnGame(req.body.gameId, res);
});

app.post('/teamVote', function(req, res){
  Game.teamVote(req.body.gameId, req.body.playerId, req.body.vote);
  broadcastGame(req.body.gameId);
  returnGame(req.body.gameId, res);
});

app.post('/heistVote', function(req, res){
  Game.heistVote(req.body.gameId, req.body.playerId, req.body.vote);
  broadcastGame(req.body.gameId);
  returnGame(req.body.gameId, res);
});

app.post('/lastDitch', function(req, res){
  Game.lastDitch(req.body.gameId, req.body.playerId);
  broadcastGame(req.body.gameId);
  returnGame(req.body.gameId, res);
});
