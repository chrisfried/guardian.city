var _ = require('underscore');
var gameList = [];

var variants = [
  {
    players: 5,
    minority: 2,
    heistTeamSizes: [2,3,2,3,3],
    double: false
  },
  {
    players: 6,
    minority: 2,
    heistTeamSizes: [2,3,4,3,4],
    double: false
  },
  {
    players: 7,
    minority: 3,
    heistTeamSizes: [2,3,3,4,4],
    double: true
  },
  {
    players: 8,
    minority: 3,
    heistTeamSizes: [3,4,4,5,5],
    double: true
  },
  {
    players: 9,
    minority: 3,
    heistTeamSizes: [3,4,4,5,5],
    double: true
  },
  {
    players: 10,
    minority: 4,
    heistTeamSizes: [3,4,4,5,5],
    double: true
  }
];

function removeFromArray(array, item) {
  var index = array.indexOf(item);
  if(index !== -1) {
    array.splice(index, 1);
  }
}

function getGame(gameId) {
  return _.find(gameList, function(game) { return game.id === gameId; });
}

function getSeat(game, playerId) {
  return _.find(game.seats, function(seat) { return seat.playerId === playerId; });
}

function listAvailable() {
  return toInfo(_.filter(gameList, function(x) {
    return !x.isStarted
  }));
}

function listAll() {
  return toInfo(gameList);
}

function toInfo(gameList) {
  return _.map(gameList, function(game) {
    return { id: game.id, name: game.name, playerCount: game.seats.length };
  });
}

function addGame(game) {
  game.seats = [];
  game.readyToStart = false;
  game.isStarted = false;
  game.state = 'pregame';
  gameList.push(game);
  return game;
}

function joinGame(game, player) {
  var duplicateCheck = _.find(game.seats, function(seat) {
    return player.id === seat.playerId;
  });

  if (!game.isStarted && (!game.seats || game.seats.length < 10) && !duplicateCheck) {
    var newSeat = {
      playerId: player.id,
      playerName: player.name,
      isMinority: false,
      isAllKnowing: false,
      isLastDitch: false,
      isLastDitched: false,
      isLeader: false,
      isReady: false,
      isOnTeam: false,
      hasTeamVoted: false,
      teamVote: false,
      hasHeistVoted: false,
      heistVote: false,
      vacant: false,
      vacatorName: '',
      roleName: 'a Criminal'
    };
    game.seats.push(newSeat);
  }

  if (game.seats && (game.seats.length >= 5 && game.seats.length <=10)) {
    game.readyToStart = true;
  } else {
    game.readyToStart = false;
  }

  if (game.isStarted) {
    var oldSeat = _.find(game.seats, function(seat) {
      return seat.vacatorName === player.name;
    });
    if (oldSeat) {
      oldSeat.playerId = player.id;
      oldSeat.playerName = player.name;
      oldSeat.vacatorName = '';
      oldSeat.vacant = false;
    }
  }

  return game;
}

function departGame(gameId, playerId) {
  var game = getGame(gameId);
  if (game) {
    var vacatedSeat = _.find(game.seats, function(seat) {
      return seat.playerId === playerId;
    });

    if (!game.isStarted) {
      removeFromArray(game.seats, vacatedSeat);
      if (game.seats.length < 1) {
        removeFromArray(gameList, game);
      }
    } else {
      vacatedSeat.vacatorName = vacatedSeat.playerName;
      vacatedSeat.vacant = true;
    }

    if (game.seats && (game.seats.length >= 5 && game.seats.length <=10)) {
      game.readyToStart = true;
    } else {
      game.readyToStart = false;
    }
  }
}

function startGame(gameId) {
  var game = getGame(gameId);
  if (game.state === 'pregame' || game.state === 'postGame') {
    var playerCount = game.seats.length;
    if (playerCount >= 5 && playerCount <= 10) {
      game.isStarted = true;
      game.roundHistory = [];
      game.heistHistory = [];
      game.minority = [];
      game.heistCount = 0;
      game.attemptCount = 0;
      game.minorityVictory = false;
      game.lastDitchSuccessful = false;
      game.majorityHeistWins = 0;
      game.minorityHeistWins = 0;

      var variant = _.find(variants, function(variant) {
        return variant.players === playerCount;
      });
      game.heistTeamSizes = variant.heistTeamSizes;
      game.double = variant.double;
      game.minorityCount = variant.minority;
      _.each(game.heistTeamSizes, function(heistTeamSize) {
        game.heistHistory.push({
          completed: false,
          teamSize: heistTeamSize
        });
      });

      _.each(game.seats, function(seat){
          seat.isMinority = false;
          seat.isAllKnowing = false;
          seat.isLastDitch = false;
          seat.isLastDitched = false;
          seat.isLeader = false;
          seat.isReady = false;
          seat.isOnTeam = false;
          seat.hasTeamVoted = false;
          seat.teamVote = false;
          seat.hasHeistVoted = false;
          seat.heistVote = false;
          seat.roleName = 'a Criminal';
      });

      game.seats = _.shuffle(game.seats);
      game.seats[0].isAllKnowing = true;
      game.seats[0].roleName = 'the Criminal Mastermind';
      game.seats[1].isLastDitch = true;
      game.seats[1].isMinority = true;
      game.seats[1].roleName = 'the Detective';
      game.minority.push(game.seats[1]);

      var nextSeat = 2;
      var remainingMinority = game.minorityCount - 1;
      while (remainingMinority > 0) {
        game.seats[nextSeat].isMinority = true;
        game.seats[nextSeat].roleName = 'an Undercover Cop';
        game.minority.push(game.seats[nextSeat]);
        nextSeat++;
        remainingMinority--;
      }

      game.seats = _.shuffle(game.seats);
      game.seats[0].isLeader = true;
      game.state = 'roleReview';
    }
  }
}

function newRound(gameId) {
  var game = getGame(gameId);
  if (game.state === 'roleReview' || game.state === 'heistReview' || game.state === 'teamVote') {
    if (game.currentRound) {
      if (game.currentRound.teamAccepted) {
        game.heistCount++;
        game.attemptCount = 0;
      } else {
        game.attemptCount++;
        if (game.attemptCount > 4) {
          game.currentRound.completed = true;
          game.currentRound.heistSuccessful = false;
          game.heistHistory[game.heistCount].heistSuccessful = game.currentRound.heistSuccessful;
          game.heistHistory[game.heistCount].team = game.currentRound.team;
          game.heistHistory[game.heistCount].completed = true;
          game.minorityHeistWins++;
          game.heistCount++;
          game.attemptCount = 0;
        }
      }
      game.roundHistory.push(game.currentRound);

      _.each(game.seats, function(seat) {
        seat.isOnTeam = false;
        seat.hasTeamVoted = false;
        seat.teamVote = false;
        seat.hasHeistVoted = false;
        seat.heistVote = false;
      });
      cycleLeader(gameId);
      game.currentRound = null;
    }

    if (game.minorityHeistWins >= 3) {
      game.minorityVictory = true;
      game.state = 'postGame';
    } else if (game.majorityHeistWins >= 3) {
      game.state = 'lastDitch';
    } else {
      var leader = _.find(game.seats, function(seat) {
        return seat.isLeader === true;
      });
      game.currentRound = {
        heist: game.heistCount,
        attempt: game.attemptCount,
        teamSize: game.heistTeamSizes[game.heistCount],
        team: [],
        teamVotes: [],
        heistVotes: [],
        teamAccepted: false,
        heistSuccessful: true,
        completed: false,
        leader: leader
      };
      game.state = 'teamBuild';
    }
  }
}

function cycleLeader(gameId) {
  var game = getGame(gameId);
  var leader = _.find(game.seats, function(seat) {
    return seat.isLeader === true;
  });
  leader.isLeader = false;
  var index = game.seats.indexOf(leader);
  if (index < game.seats.length - 1) {
    index++;
  } else {
    index = 0;
  }
  game.seats[index].isLeader = true;
}

function ready(gameId, playerId) {
  var game = getGame(gameId);
  if (game.state === 'roleReview' || game.state === 'heistReview') {
    var seat = getSeat(game, playerId);
    seat.isReady = true;

    var allReady = _.every(game.seats, function(seat) {
      return seat.isReady;
    });
    if (allReady) {
      newRound(gameId);
      _.each(game.seats, function(seat) {
        seat.isReady = false;
      });
    }
  }
}

function toggleTeam(gameId, playerId) {
  var game = getGame(gameId);
  if (game.state === 'teamBuild') {
    var seat = getSeat(game, playerId);
    var onTeam = _.find(game.currentRound.team, function(seat) {
      return seat.playerId === playerId;
    });
    if (onTeam) {
      removeFromArray(game.currentRound.team, seat);
      seat.isOnTeam = false;
    } else if (game.currentRound.team.length < game.currentRound.teamSize) {
      game.currentRound.team.push(seat);
      seat.isOnTeam = true;
    }
    if (game.currentRound.team.length === game.currentRound.teamSize) {
      game.state = 'teamVote';
    }
  }
}

function teamVote(gameId, playerId, vote) {
  var game = getGame(gameId);
  if (game.state === 'teamVote') {
    var seat = getSeat(game, playerId);
    if (seat.hasTeamVoted === true) {
      var existingVote = _.find(game.currentRound.teamVotes, function(vote) {
        return vote.seat.playerId === playerId;
      });
      existingVote.vote = vote;
    } else {
      newVote = {
        seat: seat,
        vote: vote
      };
      game.currentRound.teamVotes.push(newVote);
    }
    seat.hasTeamVoted = true;
    seat.teamVote = vote;

    var allVotes = _.every(game.seats, function(seat) {
      return seat.hasTeamVoted;
    });
    if (allVotes) {
      var yesVotes = _.filter(game.seats, function(seat) {
        return seat.teamVote;
      });
      if (yesVotes.length > game.seats.length/2) {
        game.currentRound.teamAccepted = true;
        game.state = 'heist';
      } else {
        newRound(gameId);
      }
    }
  }
}

function heistVote(gameId, playerId, vote) {
  var game = getGame(gameId);
  if (game.state === 'heist') {
    var seat = getSeat(game, playerId);
    if (!seat.isMinority) {
      vote = true;
    }
    if (seat.hasHeistVoted === true) {
      var existingVote = _.find(game.currentRound.heistVotes, function(vote) {
        return vote.seat.playerId === playerId;
      });
      existingVote.vote = vote;
    } else {
      newVote = {
        seat: seat,
        vote: vote
      };
      game.currentRound.heistVotes.push(newVote);
    }
    seat.hasHeistVoted = true;
    seat.heistVote = vote;

    var allVotes = _.every(game.currentRound.team, function(seat) {
      return seat.hasHeistVoted;
    });
    if (allVotes) {
      game.currentRound.heistVotes = _.shuffle(game.currentRound.heistVotes);
      var yesVotes = _.filter(game.currentRound.team, function(seat) {
        return seat.heistVote;
      });
      if (yesVotes.length === game.currentRound.team.length || (game.currentRound.heist === 3 && yesVotes.length === game.currentRound.team.length - 1)) {
        game.majorityHeistWins++;
      } else {
        game.currentRound.heistSuccessful = false;
        game.minorityHeistWins++;
      }
      game.currentRound.completed = true;
      game.heistHistory[game.heistCount].heistSuccessful = game.currentRound.heistSuccessful;
      game.heistHistory[game.heistCount].team = game.currentRound.team;
      game.heistHistory[game.heistCount].completed = true;
      game.currentRound.heistVotes = _.shuffle(game.currentRound.heistVotes);
      game.state = 'heistReview';
    }
  }
}

function lastDitch(gameId, playerId) {
  var game = getGame(gameId);
  if (game.state === 'lastDitch') {
    var seat = getSeat(game, playerId);
    seat.isLastDitched = true;
    if (seat.isAllKnowing) {
      game.minorityVictory = true;
      game.lastDitchSuccessful = true;
    }
    game.state = 'postGame';
  }
}

exports.getGame = getGame;
exports.getSeat = getSeat;
exports.listAvailable = listAvailable;
exports.listAll = listAll;
exports.addGame = addGame;
exports.joinGame = joinGame;
exports.departGame = departGame;
exports.startGame = startGame;
exports.ready = ready;
exports.toggleTeam = toggleTeam;
exports.teamVote = teamVote;
exports.heistVote = heistVote;
exports.lastDitch = lastDitch;
