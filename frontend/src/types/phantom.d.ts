export interface PhantomWallet {
  isPhantom: boolean;
  connect(): Promise<{ publicKey: { toString(): string } }>;
  disconnect(): void;
  signTransaction(transaction: unknown): Promise<unknown>;
  signAllTransactions(transactions: unknown[]): Promise<unknown[]>;
  on(event: string, handler: (data: unknown) => void): void;
}

declare global {
  interface Window {
    solana?: PhantomWallet;
  }
}