// Global type declarations for PV3

interface Window {
  solana?: {
    isPhantom?: boolean;
    isConnected: boolean;
    publicKey: {
      toString(): string;
    };
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    signMessage(message: Uint8Array): Promise<{
      signature: Uint8Array;
    }>;
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback: (...args: any[]) => void): void;
  };
}

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      isConnected: boolean;
      publicKey: {
        toString(): string;
      };
      connect(): Promise<void>;
      disconnect(): Promise<void>;
      signMessage(message: Uint8Array): Promise<{
        signature: Uint8Array;
      }>;
      on(event: string, callback: (...args: any[]) => void): void;
      off(event: string, callback: (...args: any[]) => void): void;
    };
  }
}

export {}; 