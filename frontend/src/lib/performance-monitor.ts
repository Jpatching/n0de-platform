/**
 * Performance monitoring utility for animations and browser health
 */

interface PerformanceMetrics {
  fps: number;
  memoryUsage?: number;
  isSlowDevice: boolean;
  shouldReduceAnimations: boolean;
  apiResponseTime?: number;
  domNodes?: number;
  jsHeapSize?: number;
}

interface PerformanceDashboard {
  currentFps: number;
  averageFps: number;
  minFps: number;
  maxFps: number;
  frameDrops: number;
  lastUpdated: number;
}

class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;
  private isMonitoring = false;
  private rafId?: number;
  private fpsHistory: number[] = [];
  private frameDropCount = 0;
  private dashboard: PerformanceDashboard = {
    currentFps: 60,
    averageFps: 60,
    minFps: 60,
    maxFps: 60,
    frameDrops: 0,
    lastUpdated: Date.now()
  };
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    // Check if we're on a potentially slow device (client-side only)
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    
    const slowDeviceIndicators = [
      // Low memory (less than 4GB)
      (navigator as any).deviceMemory && (navigator as any).deviceMemory < 4,
      // Reduced CPU cores
      navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4,
      // User preference for reduced motion
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      // Low-end GPU indicators
      this.isLowEndGPU()
    ];

    const isSlowDevice = slowDeviceIndicators.some(Boolean);
    
    if (isSlowDevice) {
      console.log('🎭 Performance Monitor: Slow device detected, reducing animations');
    }
  }

  private isLowEndGPU(): boolean {
    if (typeof document === 'undefined') return true;
    
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return true;
      
      const renderer = gl.getParameter(gl.RENDERER);
      const vendor = gl.getParameter(gl.VENDOR);
      
      // Check for integrated graphics or old GPUs
      const lowEndIndicators = [
        /intel.*hd/i,
        /intel.*uhd/i,
        /mali/i,
        /adreno.*[123]/i,
        /powervr/i
      ];
      
      return lowEndIndicators.some(pattern => 
        pattern.test(renderer) || pattern.test(vendor)
      );
    } catch {
      return true; // Assume low-end if we can't detect
    }
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.frameCount = 0;
    this.lastTime = performance.now();
    
    const measureFrame = () => {
      this.frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= this.lastTime + 1000) {
        this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
        this.frameCount = 0;
        this.lastTime = currentTime;
        
        // Update FPS history and dashboard
        this.updateDashboard(this.fps);
        
        // Log performance warnings with more detail
        // if (this.fps < 30) {
        //   console.warn('🚨 Performance Monitor: Low FPS detected:', {
        //     currentFps: this.fps,
        //     averageFps: this.dashboard.averageFps,
        //     frameDrops: this.dashboard.frameDrops,
        //     memoryUsage: this.getMemoryUsage()
        //   });
        // }
      }
      
      if (this.isMonitoring) {
        this.rafId = requestAnimationFrame(measureFrame);
      }
    };
    
    this.rafId = requestAnimationFrame(measureFrame);
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }

  private updateDashboard(currentFps: number): void {
    this.fpsHistory.push(currentFps);
    
    // Keep only last 30 seconds of FPS data
    if (this.fpsHistory.length > 30) {
      this.fpsHistory.shift();
    }
    
    // Count frame drops (FPS < 55 for 60fps target)
    if (currentFps < 55) {
      this.frameDropCount++;
    }
    
    // Update dashboard metrics
    this.dashboard = {
      currentFps,
      averageFps: Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length),
      minFps: Math.min(...this.fpsHistory),
      maxFps: Math.max(...this.fpsHistory),
      frameDrops: this.frameDropCount,
      lastUpdated: Date.now()
    };
  }

  private getMemoryUsage(): number | undefined {
    return (performance as any).memory?.usedJSHeapSize;
  }

  private getDOMComplexity(): number {
    return typeof document !== 'undefined' ? document.querySelectorAll('*').length : 0;
  }

  getMetrics(): PerformanceMetrics {
    const memoryUsage = this.getMemoryUsage();
    
    return {
      fps: this.fps,
      memoryUsage,
      isSlowDevice: this.shouldReduceAnimations(),
      shouldReduceAnimations: this.shouldReduceAnimations(),
      domNodes: this.getDOMComplexity(),
      jsHeapSize: (performance as any).memory?.totalJSHeapSize
    };
  }

  getDashboard(): PerformanceDashboard {
    return { ...this.dashboard };
  }

  logPerformanceReport(): void {
    if (typeof window === 'undefined') return;
    
    const metrics = this.getMetrics();
    const dashboard = this.getDashboard();
    
    console.group('📊 Performance Report');
    console.log('FPS Stats:', {
      current: dashboard.currentFps,
      average: dashboard.averageFps,
      min: dashboard.minFps,
      max: dashboard.maxFps,
      frameDrops: dashboard.frameDrops
    });
    console.log('Memory Usage:', {
      jsHeapUsed: metrics.memoryUsage ? `${(metrics.memoryUsage / 1024 / 1024).toFixed(2)} MB` : 'N/A',
      jsHeapTotal: metrics.jsHeapSize ? `${(metrics.jsHeapSize / 1024 / 1024).toFixed(2)} MB` : 'N/A'
    });
    console.log('DOM Complexity:', `${metrics.domNodes} nodes`);
    console.log('Device Performance:', {
      isSlowDevice: metrics.isSlowDevice,
      shouldReduceAnimations: metrics.shouldReduceAnimations
    });
    console.groupEnd();
  }

  shouldReduceAnimations(): boolean {
    if (typeof window === 'undefined') return true; // Default to reduced on server
    
    // Check multiple factors for reducing animations
    const factors = [
      // User preference
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      // Low FPS
      this.fps < 45,
      // High memory usage (if available)
      (performance as any).memory && 
      (performance as any).memory.usedJSHeapSize > 100 * 1024 * 1024, // 100MB
      // Low-end device indicators
      typeof navigator !== 'undefined' && 
      (navigator as any).deviceMemory && (navigator as any).deviceMemory < 4,
    ];

    return factors.some(Boolean);
  }

  // Static method for quick checks
  static shouldUseReducedAnimations(): boolean {
    if (typeof window === 'undefined') return true; // Default to reduced on server
    
    return (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      (typeof navigator !== 'undefined' && 
       ((navigator as any).deviceMemory && (navigator as any).deviceMemory < 4) ||
       (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4))
    );
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export utility functions
export const shouldReduceAnimations = () => performanceMonitor.shouldReduceAnimations();
export const getPerformanceMetrics = () => performanceMonitor.getMetrics();
export const getPerformanceDashboard = () => performanceMonitor.getDashboard();
export const logPerformanceReport = () => performanceMonitor.logPerformanceReport();
export const PerformanceMonitorClass = PerformanceMonitor;

// Auto-start monitoring in browser
if (typeof window !== 'undefined') {
  performanceMonitor.startMonitoring();
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    performanceMonitor.stopMonitoring();
  });
}