'use client';

export type RPSChoice = 'rock' | 'paper' | 'scissors';
export type GameResult = 'win' | 'lose' | 'draw' | 'pending';

export interface RPSMove {
  choice: RPSChoice;
  timestamp: number;
}

export interface RPSResult {
  playerChoice: RPSChoice;
  opponentChoice: RPSChoice;
  outcome: GameResult;
  timestamp: number;
}

export class RPSEngine {
  playerChoice: RPSChoice | null = null;
  opponentChoice: RPSChoice | null = null;
  gameState: 'waiting' | 'playing' | 'finished' = 'waiting';
  outcome: GameResult = 'pending';

  constructor() {
    this.reset();
  }

  makeChoice(choice: RPSChoice): boolean {
    if (this.gameState !== 'waiting') return false;
    
    this.playerChoice = choice;
    return true;
  }

  setOpponentChoice(choice: RPSChoice): void {
    this.opponentChoice = choice;
    if (this.playerChoice && this.opponentChoice) {
      this.gameState = 'playing';
      this.calculateResult();
    }
  }

  private calculateResult(): void {
    if (!this.playerChoice || !this.opponentChoice) return;

    if (this.playerChoice === this.opponentChoice) {
      this.outcome = 'draw';
    } else if (
      (this.playerChoice === 'rock' && this.opponentChoice === 'scissors') ||
      (this.playerChoice === 'paper' && this.opponentChoice === 'rock') ||
      (this.playerChoice === 'scissors' && this.opponentChoice === 'paper')
    ) {
      this.outcome = 'win';
    } else {
      this.outcome = 'lose';
    }

    this.gameState = 'finished';
  }

  getResult(): RPSResult | null {
    if (!this.playerChoice || !this.opponentChoice || this.gameState !== 'finished') {
      return null;
    }

    return {
      playerChoice: this.playerChoice,
      opponentChoice: this.opponentChoice,
      outcome: this.outcome,
      timestamp: Date.now()
    };
  }

  reset(): void {
    this.playerChoice = null;
    this.opponentChoice = null;
    this.gameState = 'waiting';
    this.outcome = 'pending';
  }

  exportGameState(): {
    playerChoice: RPSChoice | null;
    opponentChoice: RPSChoice | null;
    outcome: GameResult;
    gameState: string;
    timestamp: number;
  } {
    return {
      playerChoice: this.playerChoice,
      opponentChoice: this.opponentChoice,
      outcome: this.outcome,
      gameState: this.gameState,
      timestamp: Date.now()
    };
  }

  getChoiceEmoji(choice: RPSChoice): string {
    switch (choice) {
      case 'rock': return '🪨';
      case 'paper': return '📄';
      case 'scissors': return '✂️';
      default: return '❓';
    }
  }

  getWinningChoice(against: RPSChoice): RPSChoice {
    switch (against) {
      case 'rock': return 'paper';
      case 'paper': return 'scissors';
      case 'scissors': return 'rock';
    }
  }
} 