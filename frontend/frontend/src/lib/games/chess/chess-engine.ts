// Simple Chess Engine for PV3 Blitz
export type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
export type PieceColor = 'white' | 'black';
export type Square = {
  piece: PieceType | null;
  color: PieceColor | null;
};

export type Position = {
  row: number;
  col: number;
};

export type Move = {
  from: Position;
  to: Position;
  piece: PieceType;
  color: PieceColor;
  captured?: PieceType;
};

export type GameState = 'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw';

export class ChessEngine {
  board: Square[][];
  currentPlayer: PieceColor;
  gameState: GameState;
  moveHistory: Move[];
  whiteTime: number; // milliseconds
  blackTime: number; // milliseconds
  lastMoveTime: number;

  constructor() {
    this.board = this.initializeBoard();
    this.currentPlayer = 'white';
    this.gameState = 'playing';
    this.moveHistory = [];
    this.whiteTime = 5 * 60 * 1000; // 5 minutes
    this.blackTime = 5 * 60 * 1000; // 5 minutes
    this.lastMoveTime = Date.now();
  }

  private initializeBoard(): Square[][] {
    const board: Square[][] = Array(8).fill(null).map(() => 
      Array(8).fill(null).map(() => ({ piece: null, color: null }))
    );

    // Place white pieces
    const backRankWhite: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    for (let col = 0; col < 8; col++) {
      board[7][col] = { piece: backRankWhite[col], color: 'white' };
      board[6][col] = { piece: 'pawn', color: 'white' };
    }

    // Place black pieces
    const backRankBlack: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    for (let col = 0; col < 8; col++) {
      board[0][col] = { piece: backRankBlack[col], color: 'black' };
      board[1][col] = { piece: 'pawn', color: 'black' };
    }

    return board;
  }

  isValidMove(from: Position, to: Position): boolean {
    // Use legal move validation which includes check safety
    return this.isLegalMove(from, to);
  }

  private isBasicValidMove(from: Position, to: Position): boolean {
    // Basic bounds check
    if (!this.isInBounds(from) || !this.isInBounds(to)) return false;

    const piece = this.board[from.row][from.col];
    const target = this.board[to.row][to.col];

    // Must have piece to move
    if (!piece.piece || piece.color !== this.currentPlayer) return false;

    // Can't capture own piece
    if (target.piece && target.color === piece.color) return false;

    // Basic piece movement validation
    return this.isValidPieceMove(piece.piece, from, to);
  }

  private isInBounds(pos: Position): boolean {
    return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8;
  }

  private isValidPieceMove(piece: PieceType, from: Position, to: Position): boolean {
    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);

    switch (piece) {
      case 'pawn':
        return this.isValidPawnMove(from, to);
      case 'rook':
        return (rowDiff === 0 || colDiff === 0) && this.isPathClear(from, to);
      case 'knight':
        return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
      case 'bishop':
        return rowDiff === colDiff && this.isPathClear(from, to);
      case 'queen':
        return (rowDiff === 0 || colDiff === 0 || rowDiff === colDiff) && this.isPathClear(from, to);
      case 'king':
        return rowDiff <= 1 && colDiff <= 1;
      default:
        return false;
    }
  }

  private isValidPawnMove(from: Position, to: Position): boolean {
    const piece = this.board[from.row][from.col];
    const target = this.board[to.row][to.col];
    const direction = piece.color === 'white' ? -1 : 1;
    const startRow = piece.color === 'white' ? 6 : 1;

    const rowDiff = to.row - from.row;
    const colDiff = Math.abs(to.col - from.col);

    // Forward move
    if (colDiff === 0 && !target.piece) {
      if (rowDiff === direction) return true;
      if (from.row === startRow && rowDiff === 2 * direction) return true;
    }

    // Diagonal capture
    if (colDiff === 1 && rowDiff === direction && target.piece) {
      return true;
    }

    return false;
  }

  private isPathClear(from: Position, to: Position): boolean {
    const rowDir = Math.sign(to.row - from.row);
    const colDir = Math.sign(to.col - from.col);

    let row = from.row + rowDir;
    let col = from.col + colDir;

    while (row !== to.row || col !== to.col) {
      if (this.board[row][col].piece) return false;
      row += rowDir;
      col += colDir;
    }

    return true;
  }

  makeMove(from: Position, to: Position): boolean {
    if (!this.isValidMove(from, to)) return false;

    const piece = this.board[from.row][from.col];
    const target = this.board[to.row][to.col];

    // Record move
    const move: Move = {
      from,
      to,
      piece: piece.piece!,
      color: piece.color!,
      captured: target.piece || undefined
    };

    // Execute move
    this.board[to.row][to.col] = piece;
    this.board[from.row][from.col] = { piece: null, color: null };

    // Update time
    this.updateTime();

    // Record move and switch player
    this.moveHistory.push(move);
    this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

    // Check for game end conditions
    this.updateGameState();

    return true;
  }

  private updateTime(): void {
    const now = Date.now();
    const elapsed = now - this.lastMoveTime;

    if (this.currentPlayer === 'white') {
      this.whiteTime = Math.max(0, this.whiteTime - elapsed);
    } else {
      this.blackTime = Math.max(0, this.blackTime - elapsed);
    }

    this.lastMoveTime = now;
  }

  private updateGameState(): void {
    // Check for time out
    if (this.whiteTime <= 0) {
      this.gameState = 'checkmate'; // Black wins
      return;
    }
    if (this.blackTime <= 0) {
      this.gameState = 'checkmate'; // White wins
      return;
    }

    // Check if current player is in check
    const kingPos = this.findKing(this.currentPlayer);
    if (!kingPos) {
      this.gameState = 'checkmate'; // King missing - should not happen
      return;
    }

    const inCheck = this.isSquareUnderAttack(kingPos, this.currentPlayer === 'white' ? 'black' : 'white');
    
    // Get all legal moves for current player
    const legalMoves = this.getAllLegalMoves(this.currentPlayer);
    
    if (legalMoves.length === 0) {
      if (inCheck) {
        this.gameState = 'checkmate';
      } else {
        this.gameState = 'stalemate';
      }
      return;
    }

    if (inCheck) {
      this.gameState = 'check';
    } else {
      this.gameState = 'playing';
    }
  }

  private findKing(color: PieceColor): Position | null {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = this.board[row][col];
        if (square.piece === 'king' && square.color === color) {
          return { row, col };
        }
      }
    }
    return null;
  }

  private isSquareUnderAttack(pos: Position, byColor: PieceColor): boolean {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = this.board[row][col];
        if (square.piece && square.color === byColor) {
          if (this.canPieceAttackSquare({ row, col }, pos)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private canPieceAttackSquare(from: Position, to: Position): boolean {
    const piece = this.board[from.row][from.col];
    if (!piece.piece) return false;

    // Special case for pawns - they attack differently than they move
    if (piece.piece === 'pawn') {
      const direction = piece.color === 'white' ? -1 : 1;
      const rowDiff = to.row - from.row;
      const colDiff = Math.abs(to.col - from.col);
      return rowDiff === direction && colDiff === 1;
    }

    return this.isValidPieceMove(piece.piece, from, to);
  }

  private getAllLegalMoves(color: PieceColor): { from: Position; to: Position }[] {
    const moves: { from: Position; to: Position }[] = [];
    
    for (let fromRow = 0; fromRow < 8; fromRow++) {
      for (let fromCol = 0; fromCol < 8; fromCol++) {
        const piece = this.board[fromRow][fromCol];
        if (piece.piece && piece.color === color) {
          const from = { row: fromRow, col: fromCol };
          
          for (let toRow = 0; toRow < 8; toRow++) {
            for (let toCol = 0; toCol < 8; toCol++) {
              const to = { row: toRow, col: toCol };
              if (this.isBasicValidMove(from, to)) {
                // Check if move leaves king in check
                const originalTo = { ...this.board[to.row][to.col] };
                const originalFrom = { ...this.board[from.row][from.col] };
                
                this.board[to.row][to.col] = this.board[from.row][from.col];
                this.board[from.row][from.col] = { piece: null, color: null };
                
                const kingPos = this.findKing(color);
                const inCheck = kingPos ? this.isSquareUnderAttack(kingPos, color === 'white' ? 'black' : 'white') : true;
                
                // Restore board
                this.board[from.row][from.col] = originalFrom;
                this.board[to.row][to.col] = originalTo;
                
                if (!inCheck) {
                  moves.push({ from, to });
                }
              }
            }
          }
        }
      }
    }
    
    return moves;
  }

  private isLegalMove(from: Position, to: Position): boolean {
    if (!this.isBasicValidMove(from, to)) return false;
    
    // Make temporary move
    const originalTo = { ...this.board[to.row][to.col] };
    const originalFrom = { ...this.board[from.row][from.col] };
    
    this.board[to.row][to.col] = this.board[from.row][from.col];
    this.board[from.row][from.col] = { piece: null, color: null };
    
    // Check if king is in check after move
    const kingPos = this.findKing(this.currentPlayer);
    const inCheck = kingPos ? this.isSquareUnderAttack(kingPos, this.currentPlayer === 'white' ? 'black' : 'white') : true;
    
    // Restore board
    this.board[from.row][from.col] = originalFrom;
    this.board[to.row][to.col] = originalTo;
    
    return !inCheck;
  }

  getTimeRemaining(): { white: number; black: number } {
    this.updateTime();
    return {
      white: this.whiteTime,
      black: this.blackTime
    };
  }

  getPiece(pos: Position): Square {
    return this.board[pos.row][pos.col];
  }

  getWinner(): PieceColor | 'draw' | null {
    // Check for timeout
    if (this.whiteTime <= 0) return 'black';
    if (this.blackTime <= 0) return 'white';
    
    // Check for checkmate/stalemate
    if (this.gameState === 'checkmate') {
      // The current player is in checkmate, so the other player wins
      return this.currentPlayer === 'white' ? 'black' : 'white';
    }
    
    if (this.gameState === 'stalemate' || this.gameState === 'draw') {
      return 'draw';
    }
    
    return null;
  }

  /**
   * Export complete game state for result submission
   */
  exportGameState(): {
    moves: any[];
    winner: 'white' | 'black' | 'draw' | null;
    endReason: 'checkmate' | 'timeout' | 'resignation' | 'draw' | null;
    whiteTime: number;
    blackTime: number;
    finalPosition: string;
  } {
    return {
      moves: this.moveHistory.map(move => ({
        ...move,
        timestamp: Date.now() // In real implementation, use actual move timestamps
      })),
      winner: this.getWinner(),
      endReason: this.getEndReason(),
      whiteTime: this.whiteTime,
      blackTime: this.blackTime,
      finalPosition: this.getBoardFEN()
    };
  }

  /**
   * Get the end reason for the game
   */
  private getEndReason(): 'checkmate' | 'timeout' | 'resignation' | 'draw' | null {
    if (this.gameState === 'checkmate') {
      if (this.whiteTime <= 0) return 'timeout';
      if (this.blackTime <= 0) return 'timeout';
      return 'checkmate';
    }
    if (this.gameState === 'stalemate' || this.gameState === 'draw') {
      return 'draw';
    }
    return null;
  }

  /**
   * Generate FEN notation for current position (simplified)
   */
  private getBoardFEN(): string {
    // Simplified FEN generation - in production, use proper FEN library
    let fen = '';
    for (let row = 0; row < 8; row++) {
      let emptyCount = 0;
      for (let col = 0; col < 8; col++) {
        const square = this.board[row][col];
        if (square.piece) {
          if (emptyCount > 0) {
            fen += emptyCount;
            emptyCount = 0;
          }
          const pieceChar = this.getPieceChar(square.piece, square.color!);
          fen += pieceChar;
        } else {
          emptyCount++;
        }
      }
      if (emptyCount > 0) fen += emptyCount;
      if (row < 7) fen += '/';
    }
    
    // Add additional FEN components (simplified)
    fen += ` ${this.currentPlayer[0]} - - 0 1`;
    return fen;
  }

  /**
   * Get piece character for FEN notation
   */
  private getPieceChar(piece: PieceType, color: PieceColor): string {
    const chars: { [key in PieceType]: string } = {
      pawn: 'p',
      rook: 'r',
      knight: 'n',
      bishop: 'b',
      queen: 'q',
      king: 'k'
    };
    
    const char = chars[piece];
    return color === 'white' ? char.toUpperCase() : char;
  }

  /**
   * Handle resignation
   */
  resign(color: PieceColor): void {
    this.gameState = 'checkmate';
    // Winner is the opposite color
    // This will be picked up by getWinner()
  }

  /**
   * Check if player can resign
   */
  canResign(color: PieceColor): boolean {
    return this.gameState === 'playing' || this.gameState === 'check';
  }

  /**
   * Offer/accept draw
   */
  offerDraw(): void {
    this.gameState = 'draw';
  }

  /**
   * Reset game for new match
   */
  resetGame(): void {
    this.board = this.initializeBoard();
    this.currentPlayer = 'white';
    this.gameState = 'playing';
    this.moveHistory = [];
    this.whiteTime = 5 * 60 * 1000; // 5 minutes
    this.blackTime = 5 * 60 * 1000; // 5 minutes
    this.lastMoveTime = Date.now();
  }
} 