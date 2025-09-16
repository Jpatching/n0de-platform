/**
 * Safe date utility functions for handling dates with proper validation
 * Prevents "RangeError: date value is not finite" errors when formatting invalid dates
 */

export type DateInput = string | number | Date | null | undefined;

export interface DateFormatOptions {
  fallback?: string;
  includeTime?: boolean;
  relative?: boolean;
  compact?: boolean;
}

/**
 * Safely validates if a date input is valid and finite
 */
export function isValidDate(dateInput: DateInput): boolean {
  if (dateInput === null || dateInput === undefined) return false;
  
  const date = new Date(dateInput);
  
  // Check if date is valid and finite
  return !isNaN(date.getTime()) && isFinite(date.getTime());
}

/**
 * Safely formats a date with proper validation and fallbacks
 * @param dateInput - The date to format (string, number, Date, null, or undefined)
 * @param options - Formatting options and fallback text
 */
export function formatDate(
  dateInput: DateInput,
  options: DateFormatOptions = {}
): string {
  const {
    fallback = 'Never',
    includeTime = false,
    relative = false,
    compact = false
  } = options;

  // Return fallback for null/undefined/invalid dates
  if (!isValidDate(dateInput)) {
    return fallback;
  }

  const date = new Date(dateInput!);

  try {
    // Relative formatting (e.g., "2 days ago", "in 3 hours")
    if (relative) {
      return formatRelativeDate(date);
    }

    // Compact formatting (e.g., "Jan 15")
    if (compact) {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric'
      }).format(date);
    }

    // Standard formatting with optional time
    const formatOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };

    if (includeTime) {
      formatOptions.hour = 'numeric';
      formatOptions.minute = '2-digit';
      formatOptions.hour12 = true;
    }

    return new Intl.DateTimeFormat('en-US', formatOptions).format(date);
  } catch (error) {
    console.error('Date formatting error:', error, 'Input:', dateInput);
    return fallback;
  }
}

/**
 * Formats a date as a relative time string (e.g., "2 days ago", "in 3 hours")
 */
export function formatRelativeDate(date: Date): string {
  try {
    const now = new Date();
    const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);
    const absDiff = Math.abs(diffInSeconds);

    // Less than 1 minute
    if (absDiff < 60) {
      return 'Just now';
    }

    // Less than 1 hour
    if (absDiff < 3600) {
      const minutes = Math.floor(absDiff / 60);
      const suffix = diffInSeconds > 0 ? 'from now' : 'ago';
      return `${minutes} minute${minutes === 1 ? '' : 's'} ${suffix}`;
    }

    // Less than 1 day
    if (absDiff < 86400) {
      const hours = Math.floor(absDiff / 3600);
      const suffix = diffInSeconds > 0 ? 'from now' : 'ago';
      return `${hours} hour${hours === 1 ? '' : 's'} ${suffix}`;
    }

    // Less than 30 days
    if (absDiff < 2592000) {
      const days = Math.floor(absDiff / 86400);
      const suffix = diffInSeconds > 0 ? 'from now' : 'ago';
      return `${days} day${days === 1 ? '' : 's'} ${suffix}`;
    }

    // Use standard formatting for older dates
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch (error) {
    console.error('Relative date formatting error:', error);
    return 'Unknown';
  }
}

/**
 * Safely formats a currency amount with proper validation
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string = 'USD',
  options: { fallback?: string; divideBy?: number } = {}
): string {
  const { fallback = '$0.00', divideBy = 100 } = options;

  if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
    return fallback;
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / divideBy);
  } catch (error) {
    console.error('Currency formatting error:', error);
    return fallback;
  }
}

/**
 * Safely formats a date range with proper validation
 */
export function formatDateRange(
  startDate: DateInput,
  endDate: DateInput,
  options: DateFormatOptions = {}
): string {
  const { fallback = 'No date range' } = options;

  if (!isValidDate(startDate) && !isValidDate(endDate)) {
    return fallback;
  }

  const start = isValidDate(startDate) ? formatDate(startDate, options) : 'Unknown';
  const end = isValidDate(endDate) ? formatDate(endDate, options) : 'Unknown';

  return `${start} - ${end}`;
}

/**
 * Get a safe Date object with validation
 */
export function getSafeDate(dateInput: DateInput): Date | null {
  if (!isValidDate(dateInput)) {
    return null;
  }

  return new Date(dateInput!);
}

/**
 * Check if a date is in the past
 */
export function isPastDate(dateInput: DateInput): boolean {
  const date = getSafeDate(dateInput);
  if (!date) return false;

  return date.getTime() < Date.now();
}

/**
 * Check if a date is in the future
 */
export function isFutureDate(dateInput: DateInput): boolean {
  const date = getSafeDate(dateInput);
  if (!date) return false;

  return date.getTime() > Date.now();
}

/**
 * Common date formatting presets for subscription data
 */
export const DatePresets = {
  /**
   * Format for subscription billing dates (e.g., "Jan 15, 2024")
   */
  billing: (dateInput: DateInput) => formatDate(dateInput, { 
    fallback: 'No billing date' 
  }),

  /**
   * Format for "last activity" dates with relative time
   */
  activity: (dateInput: DateInput) => formatDate(dateInput, { 
    fallback: 'Never', 
    relative: true 
  }),

  /**
   * Format for subscription expiration dates with helpful context
   */
  expiration: (dateInput: DateInput) => {
    if (!isValidDate(dateInput)) return 'Never expires';
    
    const formatted = formatDate(dateInput);
    const isPast = isPastDate(dateInput);
    
    return isPast ? `Expired ${formatted}` : `Expires ${formatted}`;
  },

  /**
   * Format for payment history dates
   */
  payment: (dateInput: DateInput) => formatDate(dateInput, { 
    fallback: 'Unknown date',
    includeTime: true 
  }),

  /**
   * Compact format for dashboard usage
   */
  compact: (dateInput: DateInput) => formatDate(dateInput, { 
    fallback: 'N/A', 
    compact: true 
  })
};