import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format SOL amounts with proper decimals
export function formatSOL(amount: number): string {
  if (amount === 0) return '0 SOL';
  if (amount < 0.001) return '<0.001 SOL';
  if (amount < 1) return `${amount.toFixed(3)} SOL`;
  if (amount < 10) return `${amount.toFixed(2)} SOL`;
  if (amount < 1000) return `${amount.toFixed(1)} SOL`;
  return `${(amount / 1000).toFixed(1)}k SOL`;
}

// Button styles utility
export function buttonStyles(variant: 'primary' | 'secondary' | 'danger' = 'primary') {
  const base = "px-4 py-2 rounded-lg font-medium transition-all duration-200";
  
  switch (variant) {
    case 'primary':
      return cn(base, "bg-blue-600 hover:bg-blue-700 text-white");
    case 'secondary':
      return cn(base, "bg-gray-600 hover:bg-gray-700 text-white");
    case 'danger':
      return cn(base, "bg-red-600 hover:bg-red-700 text-white");
    default:
      return cn(base, "bg-blue-600 hover:bg-blue-700 text-white");
  }
}

// Format wallet address for display
export function formatWallet(address: string): string {
  if (!address || address.length < 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

// Format time ago for display
export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}
