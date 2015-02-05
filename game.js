var _ = require('underscore');
var gameList = [];

var variants = [
  {
    players: 5,
    minority: 2,
    questTeamSizes: [2,3,2,3,3],
    double: false
  },
  {
    players: 6,
    minority: 2,
    questTeamSizes: [2,3,4,3,4],
    double: false
  },
  {
    players: 7,
    minority: 3,
    questTeamSizes: [2,3,3,4,4],
    double: true
  },
  {
    players: 8,
    minority: 3,
    questTeamSizes: [3,4,4,5,5],
    double: true
  },
  {
    players: 9,
    minority: 3,
    questTeamSizes: [3,4,4,5,5],
    double: true
  },
  {
    players: 10,
    minority: 4,
    questTeamSizes: [3,4,4,5,5],
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

function addGame(game) {
  game.seats = [];
  game.readyToStart = false;
  game.isStarted = false;
  game.state = 'pregame';
  gameList.push(game);
  return game;
}

function joinGame(game, player) {
  if (!game.isStarted && (!game.seats || game.seats.length < 10)) {
    var newSeat = {
      playerId: player.id,
      playerName: player.name,
      isMinority: false,
      isAllKnowing: false,
      isLastDitch: false,
      isLeader: false,
      isReady: false,
      isOnTeam: false,
      hasTeamVoted: false,
      teamVote: false,
      hasQuestVoted: false,
      questVote: false,
      vacant: false,
      vacatorName: ''
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
  var vacatedSeat = _.find(game.seats, function(seat) {
    return seat.playerId === playerId;
  });

  if (game && !game.isStarted) {
    removeFromArray(game.seats, vacatedSeat);
    if (game.seats.length < 1) {
      removeFromArray(gameList, game);
    }
  }

  else if (game && game.isStarted) {
    vacatedSeat.vacatorName = vacatedSeat.playerName;
    vacatedSeat.vacant = true;
  }

  if (game.seats && (game.seats.length >= 5 && game.seats.length <=10)) {
    game.readyToStart = true;
  } else {
    game.readyToStart = false;
  }
}

function startGame(gameId) {
  var game = getGame(gameId);
  var playerCount = game.seats.length;
  if (playerCount >= 5 && playerCount <= 10) {
    game.isStarted = true;
    game.roundHistory = [];
    game.questCount = 0;
    game.attemptCount = 0;
    game.minorityVictory = false;
    game.lastDitchSuccessful = false;
    game.majorityQuestWins = 0;
    game.minorityQuestWins = 0;

    var variant = _.find(variants, function(variant) {
      return variant.players === playerCount;
    });
    game.questTeamSizes = variant.questTeamSizes;
    game.double = variant.double;
    game.minority = variant.minority;

    game.seats = _.shuffle(game.seats);
    game.seats[0].isAllKnowing = true;
    game.seats[1].isLastDitch = true;
    game.seats[1].isMinority = true;

    var nextSeat = 2;
    var remainingMinority = game.minority - 1;
    while (remainingMinority > 0) {
      game.seats[nextSeat].isMinority = true;
      nextSeat++;
      remainingMinority--;
    }

    game.seats = _.shuffle(game.seats);
    game.seats[0].isLeader = true;
    game.state = 'roleReview';
  }
}

function newRound(gameId) {
  var game = getGame(gameId);
  if (game.currentRound) {
    if (game.currentRound.teamAccepted) {
      game.questCount++;
      game.attemptCount = 0;
    } else {
      game.attemptCount++;
      if (game.attemptCount > 4) {
        game.currentRound.completed = true;
        game.currentRound.questSuccessful = false;
        game.minorityQuestWins++;
        game.questCount++;
        game.attemptCount = 0;
      }
    }
    game.roundHistory.push(game.currentRound);

    _.each(game.seats, function(seat) {
      seat.isOnTeam = false;
      seat.hasTeamVoted = false;
      seat.teamVote = false;
      seat.hasQuestVoted = false;
      seat.questVote = false;
    });
    cycleLeader(gameId);
    game.currentRound = null;
  }

  if (game.minorityQuestWins >= 3) {
    game.minorityVictory = true;
    game.state = 'postGame';
    game.isStarted = false;
  } else if (game.majorityQuestWins >= 3) {
    game.state = 'lastDitch';
  } else {
    var leader = _.find(game.seats, function(seat) {
      return seat.isLeader === true;
    });
    game.currentRound = {
      quest: game.questCount,
      attempt: game.attemptCount,
      teamSize: game.questTeamSizes[game.questCount],
      team: [],
      teamVotes: [],
      questVotes: [],
      teamAccepted: false,
      questSuccessful: true,
      completed: false,
      leader: leader
    };
    game.state = 'teamBuild';
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

function readyToStart(gameId, playerId) {
  var game = getGame(gameId);
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

function addTeamMember(gameId, playerId) {
  var game = getGame(gameId);
  var seat = getSeat(game, playerId);
  if (game.currentRound.team.length < game.currentRound.teamSize) {
    game.currentRound.team.push(seat);
  }
  if (game.currentRound.team.length === game.currentRound.teamSize) {
    game.state = 'teamVote';
  }
}

function removeTeamMember(gameId, playerId) {
  var game = getGame(gameId);
  var seatToRemove = _.find(game.currentRound.team, function(seat) {
    return seat.playerId === playerId;
  });
  if (seatToRemove) {
    removeFromArray(game.currentRound.team, seatToRemove);
  }
}

function teamVote(gameId, playerId, vote) {
  var game = getGame(gameId);
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
      game.state = 'quest';
    } else {
      newRound(gameId);
    }
  }
}

function questVote(gameId, playerId, vote) {
  var game = getGame(gameId);
  var seat = getSeat(game, playerId);
  if (seat.hasQuestVoted === true) {
    var existingVote = _.find(game.currentRound.questVotes, function(vote) {
      return vote.seat.playerId === playerId;
    });
    existingVote.vote = vote;
  } else {
    newVote = {
      seat: seat,
      vote: vote
    };
    game.currentRound.questVotes.push(newVote);
  }
  seat.hasQuestVoted = true;
  seat.questVote = vote;

  var allVotes = _.every(game.currentRound.team, function(seat) {
    return seat.hasQuestVoted;
  });
  if (allVotes) {
    var yesVotes = _.filter(game.currentRound.team, function(seat) {
      return seat.questVote;
    });
    if (yesVotes.length === game.currentRound.team.length || (game.currentRound.quest === 3 && yesVotes.length === game.currentRound.team.length - 1)) {
      game.majorityQuestWins++;
    } else {
      game.currentRound.questSuccessful = false;
      game.minorityQuestWins++;
    }
    game.state = 'questReview';
  }
}

function lastDitch(gameId, playerId) {
  var game = getGame(gameId);
  var seat = getSeat(game, playerId);
  if (seat.isAllKnowing) {
    game.minorityVictory = true;
    game.lastDitchSuccessful = true;
  }
  game.state = 'postGame';
  game.isStarted = false;
}
