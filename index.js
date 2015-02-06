var express = require('express');
var app = express();
var server = require('http').createServer(app);
var bodyParser = require('body-parser');
var Game = require('./game.js');
var players = { };
var io = require('socket.io').listen(server);
var socketCount = 0;

server.listen(process.env.PORT || 3000);

app.use(bodyParser.json());
app.use('/public', express.static('public'));

function returnGame(gameId, res) { res.json(gameViewModel(gameId)); }

function broadcastGame(gameId) {
  var vm = gameViewModel(gameId);
  for(var player in players[gameId]) {
    players[gameId][player].emit("updateGame", vm);
  }
}

function gameViewModel(gameId) {
  var game = Game.getGame(gameId);
  var viewModel = JSON.parse(JSON.stringify(game));
  return viewModel;
}

var lobbySocket = io
  .of('/lobby')
  .on('connection', function(socket) {
    console.info('lobby socket connect');
    var gameList = Game.listAvailable();
    socket.emit('lobbyJoin', gameList);
  })

io.sockets.on('connection', function(socket) {
  socketCount+=1;
  console.info('*****SocketCount: ' + socketCount);
  socket.on('connectToGame', function(data) {
    console.info('server: connectToGame');
    var game = Game.getGame(data.gameId);
    if(game){
      if(!players[data.gameId]) {
        players[data.gameId] = { };
      }
      socket.gameId = data.gameId;
      socket.playerId = data.playerId;
      players[data.gameId][data.playerId] = socket;
      broadcastGame(data.gameId);
    } else {
      socket.emit('gameError', 'Invalid Game ID');
    }
  });

  socket.on('disconnect', function() {
    socketCount-=1;
    if(socket.playerId && socket.gameId){
      console.info('socket disconnect ' + socket.playerId);
      delete players[socket.gameId][socket.playerId];
      Game.departGame(socket.gameId, socket.playerId);
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
app.get('/gamebyid', function (req, res) { res.json(Game.getGame(req.query.id)); });

app.post('/joingame', function (req, res) {
  var game = Game.getGame(req.body.gameId);
  if(!game) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.write(JSON.stringify({ error: "invalid GameId" }));
    res.end();
    return null;
  }

  game = Game.joinGame(game, { id: req.body.playerId, name: req.body.playerName });
  returnGame(req.body.gameId, res);
  lobbySocket.emit('gameAdded', Game.listAvailable());
});

app.post('/departgame', function(req, res) {
  Game.departGame(req.body.gameId, req.body.playerId);
  lobbySocket.emit('gameAdded', Game.listAvailable());
  broadcastGame(req.body.gameId);
});

app.post('/startgame', function(req, res) {
  Game.startGame(req.body.gameId);
  broadcastGame(req.body.gameId);
  returnGame(req.body.gameId, res);
});

app.post('/ready', function(req, res) {
  Game.ready(req.body.gameId, req.body.playerId);
  broadcastGame(req.body.gameId);
  returnGame(req.body.gameId, res);
});

app.post('/addteammember', function(req, res){
  Game.addTeamMember(req.body.gameId, req.body.playerId);
  broadcastGame(req.body.gameId);
  returnGame(req.body.gameId, res);
});

app.post('/removeteammember', function(req, res){
  Game.removeTeamMember(req.body.gameId, req.body.playerId);
  broadcastGame(req.body.gameId);
  returnGame(req.body.gameId, res);
});

app.post('/teamvote', function(req, res){
  Game.teamVote(req.body.gameId, req.body.playerId, req.body.vote);
  broadcastGame(req.body.gameId);
  returnGame(req.body.gameId, res);
});

app.post('/questvote', function(req, res){
  Game.questVote(req.body.gameId, req.body.playerId, req.body.vote);
  broadcastGame(req.body.gameId);
  returnGame(req.body.gameId, res);
});

app.post('/lastditch', function(req, res){
  Game.lastDitch(req.body.gameId, req.body.playerId);
  broadcastGame(req.body.gameId);
  returnGame(req.body.gameId, res);
});
