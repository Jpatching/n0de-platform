/**
 * CSS Utilities for preventing undefined property errors
 */

export type CSSStyleValue = string | number | undefined | null;

/**
 * Global CSS validation middleware for Next.js
 */
export function initializeCSSValidation() {
  if (typeof window === 'undefined') return;

  // Monitor for CSS errors and fix them automatically
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const element = mutation.target as HTMLElement;
        const style = element.style;

        // Check for undefined values in critical properties
        ['opacity', 'filter', 'box-shadow', 'boxShadow'].forEach(prop => {
          const value = style.getPropertyValue(prop);
          if (value === 'undefined' || value === 'null') {
            style.removeProperty(prop);
          }
        });
      }
    });
  });

  // Start observing the entire document
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['style'],
    subtree: true
  });
}

/**
 * Safely filters out undefined/null CSS properties to prevent parsing errors
 */
export function sanitizeStyleObject(styles: Record<string, CSSStyleValue>): Record<string, string | number> {
  const sanitized: Record<string, string | number> = {};
  
  for (const [key, value] of Object.entries(styles)) {
    if (value !== undefined && value !== null && value !== '') {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Safe CSS property setter with fallback values
 */
export function safeCSS(value: CSSStyleValue, fallback: string | number = ''): string | number {
  if (value === undefined || value === null) {
    return fallback;
  }
  return value;
}

/**
 * Safe opacity value with 0-1 validation
 */
export function safeOpacity(value: number | string | undefined, fallback: number = 1): number {
  if (value === undefined || value === null) {
    return fallback;
  }

  // Handle string values
  if (typeof value === 'string') {
    if (value === 'undefined' || value === 'null' || value.trim() === '') {
      return fallback;
    }
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      console.warn('Invalid opacity value:', value);
      return fallback;
    }
    return Math.max(0, Math.min(1, parsed));
  }

  // Handle numeric values
  if (typeof value === 'number') {
    if (isNaN(value)) {
      return fallback;
    }
    return Math.max(0, Math.min(1, value));
  }

  return fallback;
}

/**
 * Safe animation property object for framer-motion
 */
export function safeAnimation(
  condition: boolean, 
  animation: Record<string, any>, 
  fallback: Record<string, any> = {}
): Record<string, any> {
  if (!condition) return fallback;
  
  // Validate animation object properties
  const safeAnimationObject: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(animation)) {
    if (value !== undefined && value !== null) {
      // Special handling for opacity
      if (key === 'opacity') {
        if (Array.isArray(value)) {
          safeAnimationObject[key] = value.map(v => 
            typeof v === 'number' && !isNaN(v) ? Math.max(0, Math.min(1, v)) : 1
          );
        } else if (typeof value === 'number' && !isNaN(value)) {
          safeAnimationObject[key] = Math.max(0, Math.min(1, value));
        } else {
          safeAnimationObject[key] = 1;
        }
      }
      // Special handling for filter properties
      else if (key === 'filter') {
        if (Array.isArray(value)) {
          safeAnimationObject[key] = value.map(filterValue => 
            typeof filterValue === 'string' && filterValue !== 'undefined' 
              ? filterValue 
              : 'none'
          );
        } else if (typeof value === 'string' && value !== 'undefined') {
          safeAnimationObject[key] = value;
        } else {
          safeAnimationObject[key] = 'none';
        }
      }
      // Handle other properties
      else {
        safeAnimationObject[key] = value;
      }
    }
  }
  
  return safeAnimationObject;
}

/**
 * Runtime CSS validation for debugging
 */
export function validateCSSProperties(styles: Record<string, any>, componentName?: string): void {
  if (process.env.NODE_ENV === 'development') {
    for (const [key, value] of Object.entries(styles)) {
      if (value === undefined) {
        console.warn(`🎨 CSS Warning: '${key}' is undefined in ${componentName || 'component'}`);
      }
      if (typeof value === 'string' && value === 'undefined') {
        console.error(`🚨 CSS Error: '${key}' is literal string 'undefined' in ${componentName || 'component'}`);
      }
    }
  }
}

/**
 * Error boundary for CSS generation
 */
export function safeCSSGeneration<T>(
  generator: () => T,
  fallback: T,
  componentName?: string
): T {
  try {
    const result = generator();
    if (typeof result === 'object' && result !== null) {
      validateCSSProperties(result as Record<string, any>, componentName);
    }
    return result;
  } catch (error) {
    console.error(`CSS generation error in ${componentName || 'component'}:`, error);
    return fallback;
  }
}

/**
 * Safe boxShadow value validation
 */
export function safeBoxShadow(value: any): string {
  if (value === undefined || value === null) {
    return 'none';
  }

  if (typeof value === 'string') {
    // Check for literal 'undefined' string or empty string
    if (value === 'undefined' || value.trim() === '') {
      return 'none';
    }
    // Validate box-shadow syntax
    if (value.includes('undefined') || value.includes('null') || value.includes('NaN')) {
      console.warn('Invalid box-shadow value detected:', value);
      return 'none';
    }
    return value;
  }

  if (Array.isArray(value)) {
    const validShadows = value
      .filter(shadow => {
        if (shadow === undefined || shadow === null || shadow === 'undefined') return false;
        if (typeof shadow === 'string' && shadow.trim() === '') return false;
        if (typeof shadow === 'string' && (shadow.includes('undefined') || shadow.includes('null'))) return false;
        return true;
      })
      .map(shadow => typeof shadow === 'string' ? shadow : 'none');

    return validShadows.length > 0 ? validShadows.join(', ') : 'none';
  }

  return 'none';
}

/**
 * Safe filter value validation
 */
export function safeFilter(value: any): string | string[] {
  if (value === undefined || value === null) {
    return 'none';
  }

  if (typeof value === 'string') {
    // Check for literal 'undefined' string or empty string
    if (value === 'undefined' || value.trim() === '') {
      return 'none';
    }
    // Validate filter syntax
    if (value.includes('undefined') || value.includes('null') || value.includes('NaN')) {
      console.warn('Invalid filter value detected:', value);
      return 'none';
    }
    return value;
  }

  if (Array.isArray(value)) {
    const validFilters = value
      .filter(filter => {
        if (filter === undefined || filter === null || filter === 'undefined') return false;
        if (typeof filter === 'string' && filter.trim() === '') return false;
        if (typeof filter === 'string' && (filter.includes('undefined') || filter.includes('null'))) return false;
        return true;
      })
      .map(filter => typeof filter === 'string' ? filter : 'none');

    return validFilters.length > 0 ? validFilters : ['none'];
  }

  return 'none';
}

/**
 * Safe framer-motion animate prop with comprehensive CSS validation
 */
export function safeMotionAnimate(
  animateProps: Record<string, any>,
  componentName?: string
): Record<string, any> {
  if (!animateProps || typeof animateProps !== 'object') {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`🎨 Invalid animate props in ${componentName || 'component'}`);
    }
    return {};
  }

  const safeProps: Record<string, any> = {};

  for (const [key, value] of Object.entries(animateProps)) {
    // Skip undefined, null, or 'undefined' string values
    if (value === undefined || value === null || value === 'undefined') {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`🎨 Invalid animate property '${key}' in ${componentName || 'component'}`);
      }
      continue;
    }

    // Handle opacity specifically
    if (key === 'opacity') {
      if (Array.isArray(value)) {
        safeProps[key] = value.map(v => safeOpacity(v));
      } else {
        safeProps[key] = safeOpacity(value);
      }
    }
    // Handle filter specifically
    else if (key === 'filter') {
      const filterValue = safeFilter(value);
      if (Array.isArray(filterValue)) {
        safeProps[key] = filterValue.filter(f => f !== 'none' || filterValue.length === 1);
      } else {
        safeProps[key] = filterValue;
      }
    }
    // Handle boxShadow specifically
    else if (key === 'boxShadow') {
      if (Array.isArray(value)) {
        const shadows = value.map(shadow => safeBoxShadow(shadow));
        safeProps[key] = shadows.every(s => s === 'none') ? 'none' : shadows;
      } else {
        safeProps[key] = safeBoxShadow(value);
      }
    }
    // Handle transform properties
    else if (['x', 'y', 'z', 'scale', 'rotate', 'rotateX', 'rotateY', 'rotateZ', 'skew', 'skewX', 'skewY'].includes(key)) {
      if (typeof value === 'number' && !isNaN(value)) {
        safeProps[key] = value;
      } else if (Array.isArray(value)) {
        safeProps[key] = value.filter(v => typeof v === 'number' && !isNaN(v));
      }
    }
    // Handle other properties with basic safety
    else {
      // Check for string 'undefined' or 'null'
      if (typeof value === 'string' && (value === 'undefined' || value === 'null')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`🎨 String '${value}' found for '${key}' in ${componentName || 'component'}`);
        }
        continue;
      }
      safeProps[key] = value;
    }
  }

  return safeProps;
}

/**
 * Comprehensive CSS animation wrapper for framer-motion
 */
export function safeCSSAnimation(
  animateProps: Record<string, any>,
  whileHoverProps?: Record<string, any>,
  whileTapProps?: Record<string, any>,
  componentName?: string
) {
  return {
    animate: safeMotionAnimate(animateProps, `${componentName}-animate`),
    whileHover: whileHoverProps ? safeMotionAnimate(whileHoverProps, `${componentName}-hover`) : undefined,
    whileTap: whileTapProps ? safeMotionAnimate(whileTapProps, `${componentName}-tap`) : undefined,
  };
}