'use client';

export type CoinSide = 'heads' | 'tails';
export type GameResult = 'win' | 'lose' | 'pending';
export type MatchFormat = 'single' | 'best-of-3' | 'best-of-5';

export interface CoinFlipMove {
  choice: CoinSide;
  timestamp: number;
}

export interface CoinFlipRound {
  roundNumber: number;
  playerChoice: CoinSide;
  opponentChoice: CoinSide;
  result: CoinSide;
  winner: 'player' | 'opponent' | null;
  timestamp: number;
}

export interface CoinFlipResult {
  currentRound: CoinFlipRound;
  playerScore: number;
  opponentScore: number;
  matchComplete: boolean;
  matchWinner: 'player' | 'opponent' | null;
  totalRounds: number;
  timestamp: number;
}

export class CoinFlipEngine {
  playerChoice: CoinSide | null = null;
  opponentChoice: CoinSide | null = null;
  gameState: 'waiting' | 'both-chosen' | 'flipping' | 'round-complete' | 'match-complete' = 'waiting';
  
  // Match state
  format: MatchFormat = 'best-of-5';
  currentRoundNumber: number = 1;
  playerScore: number = 0;
  opponentScore: number = 0;
  rounds: CoinFlipRound[] = [];
  
  // Required wins for each format
  private readonly requiredWins = {
    'single': 1,
    'best-of-3': 2,
    'best-of-5': 3
  };

  constructor(format: MatchFormat = 'best-of-5') {
    this.format = format;
    this.reset();
  }

  makeChoice(choice: CoinSide): boolean {
    if (this.gameState !== 'waiting' && this.gameState !== 'round-complete') return false;
    
    // If starting a new round after completing one
    if (this.gameState === 'round-complete') {
      this.startNewRound();
    }
    
    this.playerChoice = choice;
    
    // Check if both players have chosen
    if (this.opponentChoice) {
      this.gameState = 'both-chosen';
    }
    
    return true;
  }

  setOpponentChoice(choice: CoinSide): boolean {
    if (this.gameState !== 'waiting' && this.gameState !== 'round-complete') return false;
    
    // If starting a new round after completing one
    if (this.gameState === 'round-complete') {
      this.startNewRound();
    }
    
    this.opponentChoice = choice;
    
    // Check if both players have chosen
    if (this.playerChoice) {
      this.gameState = 'both-chosen';
    }
    
    return true;
  }

  canFlip(): boolean {
    return this.gameState === 'both-chosen' && !!this.playerChoice && !!this.opponentChoice;
  }

  flip(): CoinFlipResult {
    if (!this.canFlip()) {
      throw new Error('Both players must make choices before flipping');
    }

    this.gameState = 'flipping';
    
    // Generate random result
    const result: CoinSide = Math.random() < 0.5 ? 'heads' : 'tails';
    
    console.log('🎯 FLIP DEBUG:', {
      playerChoice: this.playerChoice,
      opponentChoice: this.opponentChoice,
      coinResult: result,
      playerCorrect: this.playerChoice === result,
      opponentCorrect: this.opponentChoice === result
    });
    
    // Determine round winner
    let roundWinner: 'player' | 'opponent' | null = null;
    if (this.playerChoice === result && this.opponentChoice !== result) {
      roundWinner = 'player';
      this.playerScore++;
      console.log('✅ Player wins round! Player guessed correctly, opponent did not.');
    } else if (this.opponentChoice === result && this.playerChoice !== result) {
      roundWinner = 'opponent';
      this.opponentScore++;
      console.log('❌ Opponent wins round! Opponent guessed correctly, player did not.');
    } else if (this.playerChoice === result && this.opponentChoice === result) {
      // Both correct - tie
      roundWinner = null;
      console.log('🤝 Round tied! Both players guessed correctly.');
    } else if (this.playerChoice !== result && this.opponentChoice !== result) {
      // Both wrong - tie
      roundWinner = null;
      console.log('🤝 Round tied! Both players guessed incorrectly.');
    }
    
    console.log('🏁 SCORE UPDATE:', {
      playerScore: this.playerScore,
      opponentScore: this.opponentScore,
      roundWinner
    });

    // Create round record
    const round: CoinFlipRound = {
      roundNumber: this.currentRoundNumber,
      playerChoice: this.playerChoice!,
      opponentChoice: this.opponentChoice!,
      result,
      winner: roundWinner,
      timestamp: Date.now()
    };

    this.rounds.push(round);

    // Check if match is complete
    const requiredWins = this.requiredWins[this.format];
    const matchComplete = this.playerScore >= requiredWins || this.opponentScore >= requiredWins;
    
    let matchWinner: 'player' | 'opponent' | null = null;
    if (matchComplete) {
      matchWinner = this.playerScore > this.opponentScore ? 'player' : 'opponent';
      this.gameState = 'match-complete';
    } else {
      this.gameState = 'round-complete';
    }

    return {
      currentRound: round,
      playerScore: this.playerScore,
      opponentScore: this.opponentScore,
      matchComplete,
      matchWinner,
      totalRounds: this.rounds.length,
      timestamp: Date.now()
    };
  }

  private startNewRound(): void {
    if (this.gameState === 'match-complete') return;
    
    this.currentRoundNumber++;
    this.playerChoice = null;
    this.opponentChoice = null;
    this.gameState = 'waiting';
  }

  reset(): void {
    this.playerChoice = null;
    this.opponentChoice = null;
    this.gameState = 'waiting';
    this.currentRoundNumber = 1;
    this.playerScore = 0;
    this.opponentScore = 0;
    this.rounds = [];
  }

  getMatchStatus(): {
    format: MatchFormat;
    currentRound: number;
    playerScore: number;
    opponentScore: number;
    requiredWins: number;
    isComplete: boolean;
    winner: 'player' | 'opponent' | null;
  } {
    const requiredWins = this.requiredWins[this.format];
    const isComplete = this.gameState === 'match-complete';
    let winner: 'player' | 'opponent' | null = null;
    
    if (isComplete) {
      winner = this.playerScore > this.opponentScore ? 'player' : 'opponent';
    }

    return {
      format: this.format,
      currentRound: this.currentRoundNumber,
      playerScore: this.playerScore,
      opponentScore: this.opponentScore,
      requiredWins,
      isComplete,
      winner
    };
  }

  exportGameState(): {
    playerChoice: CoinSide | null;
    opponentChoice: CoinSide | null;
    gameState: string;
    format: MatchFormat;
    currentRound: number;
    playerScore: number;
    opponentScore: number;
    rounds: CoinFlipRound[];
    timestamp: number;
  } {
    return {
      playerChoice: this.playerChoice,
      opponentChoice: this.opponentChoice,
      gameState: this.gameState,
      format: this.format,
      currentRound: this.currentRoundNumber,
      playerScore: this.playerScore,
      opponentScore: this.opponentScore,
      rounds: this.rounds,
      timestamp: Date.now()
    };
  }
} 