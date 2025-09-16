/**
 * Real-time CSS Error Monitor
 * Detects and reports CSS parsing errors in the browser console
 */

interface CSSError {
  property: string;
  value: string;
  message: string;
  timestamp: number;
  component?: string;
}

class CSSErrorMonitor {
  private errors: CSSError[] = [];
  private isMonitoring = false;
  private originalConsoleError: typeof console.error;
  private errorCounts = new Map<string, number>();

  constructor() {
    this.originalConsoleError = console.error.bind(console);
    if (typeof window !== 'undefined') {
      this.startMonitoring();
    }
  }

  startMonitoring() {
    if (this.isMonitoring || typeof window === 'undefined') return;
    
    this.isMonitoring = true;
    
    // Override console.error to catch CSS parsing errors
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      
      // Detect CSS parsing errors
      if (this.isCSSError(message)) {
        this.handleCSSError(message);
      }
      
      // Call original console.error
      this.originalConsoleError(...args);
    };

    // Monitor DOM mutations for dynamic style changes
    if (window.MutationObserver) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            this.validateInlineStyles(mutation.target as Element);
          }
        });
      });

      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['style'],
        subtree: true
      });
    }

    // Check for existing CSS errors on page load
    setTimeout(() => this.scanExistingStyles(), 1000);
  }

  private isCSSError(message: string): boolean {
    const cssErrorPatterns = [
      /Error in parsing value for/i,
      /Declaration dropped/i,
      /Expected.*but found.*undefined/i,
      /Invalid property/i,
      /Unknown property/i,
      /filter.*undefined/i,
      /opacity.*undefined/i,
      /boxShadow.*undefined/i,
      /box-shadow.*undefined/i
    ];

    return cssErrorPatterns.some(pattern => pattern.test(message));
  }

  private handleCSSError(message: string) {
    const error = this.parseCSSError(message);
    if (error) {
      this.errors.push(error);
      this.trackErrorFrequency(error);
      
      if (process.env.NODE_ENV === 'development') {
        this.reportError(error);
      }
      
      // Auto-fix common issues
      this.attemptAutoFix(error);
    }
  }

  private parseCSSError(message: string): CSSError | null {
    // Parse different CSS error formats
    const patterns = [
      /Error in parsing value for '([^']+)'.*Declaration dropped/i,
      /Expected.*but found 'undefined'.*Error in parsing value for '([^']+)'/i,
      /'([^']+)'.*undefined/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          property: match[1],
          value: 'undefined',
          message,
          timestamp: Date.now(),
          component: this.detectComponent()
        };
      }
    }

    return {
      property: 'unknown',
      value: 'undefined',
      message,
      timestamp: Date.now(),
      component: this.detectComponent()
    };
  }

  private detectComponent(): string {
    // Try to detect which component is causing the error
    const stack = new Error().stack;
    if (!stack) return 'unknown';

    const componentPatterns = [
      /(\w+)\.tsx:/,
      /(\w+)Component/,
      /(\w+)Background/,
      /(\w+)Animation/
    ];

    for (const pattern of componentPatterns) {
      const match = stack.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return 'unknown';
  }

  private trackErrorFrequency(error: CSSError) {
    const key = `${error.property}:${error.value}`;
    const count = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, count + 1);

    // Alert if error is happening frequently
    if (count > 10 && count % 10 === 0) {
      console.warn(`🎨 CSS Error Alert: ${key} has occurred ${count} times`);
    }
  }

  private reportError(error: CSSError) {
    console.group('🎨 CSS Error Detected');
    console.error('Property:', error.property);
    console.error('Value:', error.value);
    console.error('Component:', error.component);
    console.error('Message:', error.message);
    console.error('Time:', new Date(error.timestamp).toLocaleTimeString());
    
    // Provide fix suggestions
    this.provideSuggestions(error);
    
    console.groupEnd();
  }

  private provideSuggestions(error: CSSError) {
    const suggestions = {
      'opacity': 'Use safeOpacity() from css-utils or ensure value is 0-1',
      'filter': 'Use safeFilter() from css-utils or provide valid filter string',
      'boxShadow': 'Use safeBoxShadow() from css-utils or validate shadow string',
      'box-shadow': 'Use safeBoxShadow() from css-utils or validate shadow string'
    };

    const suggestion = suggestions[error.property as keyof typeof suggestions];
    if (suggestion) {
      console.info('💡 Suggestion:', suggestion);
    }
  }

  private attemptAutoFix(error: CSSError) {
    // Find all elements that might have the problematic CSS property
    const allElements = document.querySelectorAll('*');

    allElements.forEach(element => {
      const htmlElement = element as HTMLElement;
      const style = htmlElement.style;
      const computedStyle = window.getComputedStyle(htmlElement);

      // Check both inline style and computed style
      const inlineValue = style.getPropertyValue(error.property);
      const computedValue = computedStyle.getPropertyValue(error.property);

      // Fix inline styles with undefined values
      if (inlineValue === 'undefined' || inlineValue === 'null' ||
          (typeof inlineValue === 'string' && inlineValue.includes('undefined'))) {
        // Apply safe fallback values based on property type
        switch (error.property) {
          case 'opacity':
            style.setProperty(error.property, '1', 'important');
            break;
          case 'filter':
            style.setProperty(error.property, 'none', 'important');
            break;
          case 'box-shadow':
          case 'boxShadow':
            style.setProperty(error.property, 'none', 'important');
            break;
          case '-webkit-text-size-adjust':
          case '-moz-text-size-adjust':
            style.setProperty(error.property, '100%', 'important');
            break;
        }

        if (process.env.NODE_ENV === 'development') {
          console.info(`🔧 Auto-fixed ${error.property} for element:`, element);
        }
      }

      // Also check CSS text for string 'undefined' values
      if (htmlElement.style.cssText.includes('undefined')) {
        const cleanedCssText = htmlElement.style.cssText.replace(/:\s*undefined[^;]*/g, ': initial');
        htmlElement.style.cssText = cleanedCssText;
      }
    });

    // Also scan and fix any style tags
    this.fixStyleTags();
  }

  private fixStyleTags() {
    const styleTags = document.querySelectorAll('style');
    styleTags.forEach(styleTag => {
      if (styleTag.textContent && styleTag.textContent.includes('undefined')) {
        // Replace undefined values with safe defaults in style tags
        styleTag.textContent = styleTag.textContent
          .replace(/opacity:\s*undefined[^;]*/g, 'opacity: 1')
          .replace(/filter:\s*undefined[^;]*/g, 'filter: none')
          .replace(/box-shadow:\s*undefined[^;]*/g, 'box-shadow: none')
          .replace(/-webkit-text-size-adjust:\s*undefined[^;]*/g, '-webkit-text-size-adjust: 100%')
          .replace(/-moz-text-size-adjust:\s*undefined[^;]*/g, '-moz-text-size-adjust: 100%');
      }
    });
  }

  private validateInlineStyles(element: Element) {
    const style = (element as HTMLElement).style;
    const problematicProperties = ['opacity', 'filter', 'box-shadow', 'boxShadow'];
    
    problematicProperties.forEach(prop => {
      const value = style.getPropertyValue(prop);
      if (value === 'undefined' || value === undefined) {
        this.handleCSSError(`Error in parsing value for '${prop}'. Declaration dropped.`);
      }
    });
  }

  private scanExistingStyles() {
    // Check all existing inline styles for undefined values
    const elements = document.querySelectorAll('[style]');
    elements.forEach(element => this.validateInlineStyles(element));
  }

  getErrorSummary() {
    const summary = {
      totalErrors: this.errors.length,
      recentErrors: this.errors.filter(e => Date.now() - e.timestamp < 60000).length,
      topErrors: Array.from(this.errorCounts.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
      components: [...new Set(this.errors.map(e => e.component))]
    };

    return summary;
  }

  clearErrors() {
    this.errors = [];
    this.errorCounts.clear();
  }

  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    console.error = this.originalConsoleError;
  }
}

// Export singleton instance
export const cssErrorMonitor = new CSSErrorMonitor();

// Utility functions
export const getCSSErrorSummary = () => cssErrorMonitor.getErrorSummary();
export const clearCSSErrors = () => cssErrorMonitor.clearErrors();

// Development helper
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Add global access for debugging
  (window as any).__cssErrorMonitor = cssErrorMonitor;

  // Log summary every 30 seconds in development
  setInterval(() => {
    const summary = cssErrorMonitor.getErrorSummary();
    if (summary.totalErrors > 0) {
      console.log('🎨 CSS Error Summary:', summary);
    }
  }, 30000);
}