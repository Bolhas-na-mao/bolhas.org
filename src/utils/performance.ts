export type QualityLevel = 'high' | 'medium' | 'low';

export interface PerformanceConfig {
  level: QualityLevel;
  pixelRatio: number;
  particleCount: number;
  enablePostProcessing: boolean;
  enableRefraction: boolean;
  shadowsEnabled: boolean;
}

export class PerformanceManager {
  private static instance: PerformanceManager;
  private config: PerformanceConfig;

  private constructor() {
    this.config = this.detectQuality();
  }

  static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager();
    }
    return PerformanceManager.instance;
  }

  private detectQuality(): PerformanceConfig {
    const urlParams = new URLSearchParams(window.location.search);
    const forcedPerf = urlParams.get('perf') as QualityLevel | null;

    if (forcedPerf && ['high', 'medium', 'low'].includes(forcedPerf)) {
      return this.getConfigForLevel(forcedPerf);
    }

    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    const isTablet = /iPad|Android/i.test(navigator.userAgent) && !isMobile;

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

    if (!gl) {
      return this.getConfigForLevel('low');
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : '';

    const isLowEndGPU = /Intel.*HD|Mali|Adreno [1-5]/.test(renderer);

    if (isMobile || isLowEndGPU) {
      return this.getConfigForLevel('low');
    }

    if (isTablet) {
      return this.getConfigForLevel('medium');
    }

    return this.getConfigForLevel('high');
  }

  private getConfigForLevel(level: QualityLevel): PerformanceConfig {
    switch (level) {
      case 'high':
        return {
          level: 'high',
          pixelRatio: Math.min(window.devicePixelRatio, 2),
          particleCount: 150,
          enablePostProcessing: true,
          enableRefraction: true,
          shadowsEnabled: false,
        };
      case 'medium':
        return {
          level: 'medium',
          pixelRatio: 1.5,
          particleCount: 80,
          enablePostProcessing: true,
          enableRefraction: false,
          shadowsEnabled: false,
        };
      case 'low':
        return {
          level: 'low',
          pixelRatio: 1,
          particleCount: 40,
          enablePostProcessing: false,
          enableRefraction: false,
          shadowsEnabled: false,
        };
    }
  }

  getConfig(): PerformanceConfig {
    return this.config;
  }

  supportsWebGL2(): boolean {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  }

  supportsFloatTextures(): boolean {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;

    const ext = gl.getExtension('OES_texture_float');
    return !!ext;
  }
}
