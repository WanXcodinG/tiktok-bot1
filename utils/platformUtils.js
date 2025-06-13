const chalk = require('chalk');

/**
 * Platform detection and validation utilities
 */
class PlatformUtils {
  static supportedPlatforms = {
    'youtube.com': {
      name: 'YouTube',
      icon: '📺',
      color: 'red',
      formats: ['mp4', 'webm'],
      maxDuration: 43200, // 12 hours
      features: ['search', 'playlists', 'subtitles']
    },
    'youtu.be': {
      name: 'YouTube',
      icon: '📺', 
      color: 'red',
      formats: ['mp4', 'webm'],
      maxDuration: 43200,
      features: ['search', 'playlists', 'subtitles']
    },
    'tiktok.com': {
      name: 'TikTok',
      icon: '🎵',
      color: 'magenta',
      formats: ['mp4'],
      maxDuration: 600, // 10 minutes
      features: ['vertical', 'music']
    },
    'instagram.com': {
      name: 'Instagram',
      icon: '📸',
      color: 'cyan',
      formats: ['mp4'],
      maxDuration: 3600, // 1 hour for IGTV
      features: ['stories', 'reels', 'igtv']
    },
    'facebook.com': {
      name: 'Facebook',
      icon: '👥',
      color: 'blue',
      formats: ['mp4'],
      maxDuration: 14400, // 4 hours
      features: ['live', 'stories']
    },
    'fb.watch': {
      name: 'Facebook',
      icon: '👥',
      color: 'blue', 
      formats: ['mp4'],
      maxDuration: 14400,
      features: ['live', 'stories']
    },
    'twitter.com': {
      name: 'Twitter',
      icon: '🐦',
      color: 'cyan',
      formats: ['mp4'],
      maxDuration: 140, // 2 minutes 20 seconds
      features: ['short']
    },
    'x.com': {
      name: 'Twitter',
      icon: '🐦',
      color: 'cyan',
      formats: ['mp4'],
      maxDuration: 140,
      features: ['short']
    }
  };

  /**
   * Detect platform from URL
   */
  static detectPlatform(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '').replace('m.', '');
      
      for (const [domain, info] of Object.entries(this.supportedPlatforms)) {
        if (hostname.includes(domain.replace('.com', '')) || hostname === domain) {
          return {
            platform: info.name,
            domain: domain,
            ...info
          };
        }
      }
      
      return {
        platform: 'Unknown',
        domain: hostname,
        name: 'Unknown',
        icon: '❓',
        color: 'gray'
      };
    } catch (err) {
      return {
        platform: 'Invalid URL',
        error: err.message,
        name: 'Invalid URL',
        icon: '❌',
        color: 'red'
      };
    }
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if platform is supported
   */
  static isPlatformSupported(url) {
    const detection = this.detectPlatform(url);
    return detection.platform !== 'Unknown' && detection.platform !== 'Invalid URL';
  }

  /**
   * Get platform info with styling
   */
  static getPlatformInfo(url) {
    const info = this.detectPlatform(url);
    
    return {
      ...info,
      displayName: `${info.icon} ${info.name}`,
      styledName: chalk[info.color] ? chalk[info.color](info.name) : info.name
    };
  }

  /**
   * Get all supported platforms
   */
  static getSupportedPlatforms() {
    const platforms = new Map();
    
    Object.values(this.supportedPlatforms).forEach(platform => {
      if (!platforms.has(platform.name)) {
        platforms.set(platform.name, platform);
      }
    });
    
    return Array.from(platforms.values());
  }

  /**
   * Format platform list for display
   */
  static formatPlatformList() {
    const platforms = this.getSupportedPlatforms();
    return platforms.map(p => `${p.icon} ${p.name}`).join(', ');
  }

  /**
   * Validate video duration for platform
   */
  static isValidDuration(url, duration) {
    const info = this.detectPlatform(url);
    
    if (info.maxDuration && duration > info.maxDuration) {
      return {
        valid: false,
        message: `Video too long for ${info.name}. Max: ${info.maxDuration}s, Got: ${duration}s`
      };
    }
    
    return { valid: true };
  }

  /**
   * Get recommended settings for platform
   */
  static getRecommendedSettings(url) {
    const info = this.detectPlatform(url);
    
    const settings = {
      'YouTube': {
        quality: '1080p',
        format: 'mp4',
        aspectRatio: '16:9',
        bitrate: '8000k'
      },
      'TikTok': {
        quality: '720p',
        format: 'mp4', 
        aspectRatio: '9:16',
        bitrate: '4000k'
      },
      'Instagram': {
        quality: '720p',
        format: 'mp4',
        aspectRatio: '9:16',
        bitrate: '3500k'
      },
      'Facebook': {
        quality: '720p',
        format: 'mp4',
        aspectRatio: '16:9',
        bitrate: '4000k'
      },
      'Twitter': {
        quality: '720p',
        format: 'mp4',
        aspectRatio: '16:9',
        bitrate: '2000k'
      }
    };

    return settings[info.name] || settings['YouTube'];
  }

  /**
   * Extract video ID from URL
   */
  static extractVideoId(url) {
    const info = this.detectPlatform(url);
    
    try {
      const urlObj = new URL(url);
      
      switch (info.name) {
        case 'YouTube':
          return urlObj.searchParams.get('v') || 
                 urlObj.pathname.split('/').pop() ||
                 url.split('/').pop();
        
        case 'TikTok':
          return urlObj.pathname.split('/').pop() || 
                 Math.random().toString(36).substring(2, 15);
        
        case 'Instagram':
          const igMatch = url.match(/\/p\/([^\/\?]+)/);
          return igMatch ? igMatch[1] : Math.random().toString(36).substring(2, 15);
        
        case 'Facebook':
          const fbMatch = url.match(/\/videos\/(\d+)/);
          return fbMatch ? fbMatch[1] : Math.random().toString(36).substring(2, 15);
        
        case 'Twitter':
          const twitterMatch = url.match(/\/status\/(\d+)/);
          return twitterMatch ? twitterMatch[1] : Math.random().toString(36).substring(2, 15);
        
        default:
          return Math.random().toString(36).substring(2, 15);
      }
    } catch (err) {
      return Math.random().toString(36).substring(2, 15);
    }
  }

  /**
   * Log platform detection result
   */
  static logPlatformDetection(url) {
    const info = this.getPlatformInfo(url);
    
    if (info.platform === 'Invalid URL') {
      console.log(chalk.red(`❌ Invalid URL: ${url}`));
    } else if (info.platform === 'Unknown') {
      console.log(chalk.yellow(`⚠️ Unsupported platform: ${url}`));
    } else {
      console.log(chalk.green(`✅ Detected ${info.styledName}: ${url}`));
    }
    
    return info;
  }
}

module.exports = PlatformUtils;