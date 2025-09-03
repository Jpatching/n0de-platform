export interface PhantomWallet {
  isPhantom: boolean;
  connect(): Promise<{ publicKey: { toString(): string } }>;
  disconnect(): void;
  signTransaction(transaction: any): Promise<any>;
  signAllTransactions(transactions: any[]): Promise<any[]>;
  on(event: string, handler: (data: any) => void): void;
}

declare global {
  interface Window {
    solana?: PhantomWallet;
  }
}