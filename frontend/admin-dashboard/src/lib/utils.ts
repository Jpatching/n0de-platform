import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'SOL') {
  return `${amount.toFixed(4)} ${currency}`
}

export function formatPercentage(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatRelativeTime(date: Date | string) {
  const now = new Date()
  const target = new Date(date)
  const diff = now.getTime() - target.getTime()
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function truncateAddress(address: string, chars: number = 4) {
  if (!address) return ''
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

export function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'active': case 'online': case 'healthy':
      return 'text-green-400'
    case 'warning': case 'degraded':
      return 'text-yellow-400'
    case 'error': case 'offline': case 'unhealthy':
      return 'text-red-400'
    case 'maintenance': case 'paused':
      return 'text-blue-400'
    default:
      return 'text-gray-400'
  }
}

export function getStatusBgColor(status: string) {
  switch (status.toLowerCase()) {
    case 'active': case 'online': case 'healthy':
      return 'bg-green-500/20'
    case 'warning': case 'degraded':
      return 'bg-yellow-500/20'
    case 'error': case 'offline': case 'unhealthy':
      return 'bg-red-500/20'
    case 'maintenance': case 'paused':
      return 'bg-blue-500/20'
    default:
      return 'bg-gray-500/20'
  }
} 