const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const crypto = require('crypto');

/**
 * Video cleanup and duplicate management utility
 */
class VideoCleanup {
  constructor() {
    this.rawDir = path.join(__dirname, '../videos/raw');
    this.editedDir = path.join(__dirname, '../videos/edited');
    this.musicDir = path.join(__dirname, '../assets/music');
    
    // Track protected files (recently downloaded)
    this.protectedFiles = new Set();
    
    // Ensure directories exist
    fs.ensureDirSync(this.rawDir);
    fs.ensureDirSync(this.editedDir);
    fs.ensureDirSync(this.musicDir);
  }

  /**
   * Protect a file from cleanup for a specified duration
   */
  protectFile(filePath, durationMinutes = 30) {
    try {
      const absolutePath = path.resolve(filePath);
      this.protectedFiles.add(absolutePath);
      
      console.log(chalk.blue(`🛡️ Protected file from cleanup: ${path.basename(filePath)} (${durationMinutes}min)`));
      
      // Remove protection after specified duration
      setTimeout(() => {
        this.protectedFiles.delete(absolutePath);
        console.log(chalk.gray(`🔓 Protection expired for: ${path.basename(filePath)}`));
      }, durationMinutes * 60 * 1000);
      
    } catch (err) {
      console.error(chalk.red(`❌ Error protecting file: ${err.message}`));
    }
  }

  /**
   * Check if file is protected from cleanup
   */
  isFileProtected(filePath) {
    try {
      const absolutePath = path.resolve(filePath);
      return this.protectedFiles.has(absolutePath);
    } catch (err) {
      return false;
    }
  }

  /**
   * Calculate file hash for duplicate detection
   */
  async calculateFileHash(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const fileBuffer = await fs.readFile(filePath);
      const hashSum = crypto.createHash('md5');
      hashSum.update(fileBuffer);
      return hashSum.digest('hex');
    } catch (err) {
      console.error(chalk.red(`❌ Error calculating hash for ${filePath}: ${err.message}`));
      return null;
    }
  }

  /**
   * Check for duplicate files and remove older ones - IMPROVED
   */
  async removeDuplicates(directory) {
    try {
      console.log(chalk.cyan(`🔍 Checking for duplicates in ${path.basename(directory)}...`));
      
      if (!fs.existsSync(directory)) {
        return;
      }
      
      const files = fs.readdirSync(directory).filter(file => 
        (file.endsWith('.mp4') || file.endsWith('.mp3') || file.endsWith('.wav')) &&
        !file.endsWith('.part') // Skip partial downloads
      );
      
      if (files.length === 0) {
        return;
      }
      
      const fileHashes = new Map();
      const duplicates = [];
      
      // Calculate hashes for all files
      for (const file of files) {
        const filePath = path.join(directory, file);
        
        // Skip protected files
        if (this.isFileProtected(filePath)) {
          console.log(chalk.blue(`🛡️ Skipping protected file: ${file}`));
          continue;
        }
        
        const stats = fs.statSync(filePath);
        const hash = await this.calculateFileHash(filePath);
        
        if (hash) {
          if (fileHashes.has(hash)) {
            // Found duplicate
            const existingFile = fileHashes.get(hash);
            const existingStats = fs.statSync(existingFile.path);
            
            // Keep the newer file, mark older for deletion
            if (stats.mtime > existingStats.mtime) {
              duplicates.push(existingFile.path);
              fileHashes.set(hash, { path: filePath, mtime: stats.mtime });
            } else {
              duplicates.push(filePath);
            }
          } else {
            fileHashes.set(hash, { path: filePath, mtime: stats.mtime });
          }
        }
      }
      
      // Remove duplicates
      for (const duplicatePath of duplicates) {
        try {
          // Double-check protection before deletion
          if (!this.isFileProtected(duplicatePath)) {
            await fs.remove(duplicatePath);
            console.log(chalk.yellow(`🗑️ Removed duplicate: ${path.basename(duplicatePath)}`));
          } else {
            console.log(chalk.blue(`🛡️ Skipped protected duplicate: ${path.basename(duplicatePath)}`));
          }
        } catch (err) {
          console.error(chalk.red(`❌ Failed to remove duplicate ${duplicatePath}: ${err.message}`));
        }
      }
      
      if (duplicates.length > 0) {
        console.log(chalk.green(`✅ Removed ${duplicates.length} duplicate file(s)`));
      } else {
        console.log(chalk.gray(`✅ No duplicates found in ${path.basename(directory)}`));
      }
      
    } catch (err) {
      console.error(chalk.red(`❌ Error checking duplicates: ${err.message}`));
    }
  }

  /**
   * Clean up files related to a specific video ID - IMPROVED
   */
  async cleanupVideoFiles(videoId, keepOriginal = false) {
    try {
      console.log(chalk.cyan(`🧹 Cleaning up files for video: ${videoId}`));
      
      const filesToClean = [];
      
      // Find all files related to this video ID
      const allDirs = [this.rawDir, this.editedDir];
      
      for (const dir of allDirs) {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          
          for (const file of files) {
            // Check for various patterns that might contain the video ID
            const fileContainsId = file.includes(videoId) || 
                                  file.includes(videoId.replace(/[^a-zA-Z0-9]/g, '')) ||
                                  file.split('_').some(part => part === videoId);
            
            if (fileContainsId) {
              const filePath = path.join(dir, file);
              
              // Skip protected files
              if (this.isFileProtected(filePath)) {
                console.log(chalk.blue(`🛡️ Skipping protected file: ${file}`));
                continue;
              }
              
              // Skip original file if keepOriginal is true
              if (keepOriginal && dir === this.rawDir && !file.includes('-edited') && !file.includes('-final')) {
                continue;
              }
              
              filesToClean.push(filePath);
            }
          }
        }
      }
      
      // Remove files
      let removedCount = 0;
      for (const filePath of filesToClean) {
        try {
          if (fs.existsSync(filePath)) {
            await fs.remove(filePath);
            console.log(chalk.gray(`🗑️ Removed: ${path.basename(filePath)}`));
            removedCount++;
          }
        } catch (err) {
          console.error(chalk.red(`❌ Failed to remove ${filePath}: ${err.message}`));
        }
      }
      
      if (removedCount > 0) {
        console.log(chalk.green(`✅ Cleaned up ${removedCount} file(s) for video ${videoId}`));
      }
      
      return removedCount;
    } catch (err) {
      console.error(chalk.red(`❌ Error cleaning up video files: ${err.message}`));
      return 0;
    }
  }

  /**
   * Clean up all processed files after successful upload
   */
  async cleanupAfterUpload(videoId, success = true) {
    try {
      console.log(chalk.cyan(`🧹 Post-upload cleanup for video: ${videoId}`));
      
      if (success) {
        console.log(chalk.green(`✅ Upload successful - cleaning up all files`));
        // Remove all files for this video (raw, edited, final)
        await this.cleanupVideoFiles(videoId, false);
      } else {
        console.log(chalk.yellow(`⚠️ Upload failed - keeping raw file, removing processed files`));
        // Keep raw file, remove only processed files
        const processedFiles = [
          path.join(this.editedDir, `${videoId}-edited.mp4`),
          path.join(this.editedDir, `${videoId}-final.mp4`)
        ];
        
        for (const filePath of processedFiles) {
          try {
            if (fs.existsSync(filePath) && !this.isFileProtected(filePath)) {
              await fs.remove(filePath);
              console.log(chalk.gray(`🗑️ Removed processed file: ${path.basename(filePath)}`));
            }
          } catch (err) {
            console.error(chalk.red(`❌ Failed to remove ${filePath}: ${err.message}`));
          }
        }
      }
      
      // Always check for duplicates after cleanup (but respect protections)
      await this.removeDuplicates(this.rawDir);
      await this.removeDuplicates(this.editedDir);
      
    } catch (err) {
      console.error(chalk.red(`❌ Error in post-upload cleanup: ${err.message}`));
    }
  }

  /**
   * Clean old files based on age - IMPROVED WITH PROTECTION
   */
  async cleanupOldFiles(maxAgeHours = 24) {
    try {
      console.log(chalk.cyan(`🕒 Cleaning files older than ${maxAgeHours} hours...`));
      
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
      
      const directories = [this.rawDir, this.editedDir];
      let totalRemoved = 0;
      
      for (const dir of directories) {
        if (!fs.existsSync(dir)) continue;
        
        const files = fs.readdirSync(dir).filter(file => 
          !file.endsWith('.part') // Skip partial downloads
        );
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          
          // Skip protected files
          if (this.isFileProtected(filePath)) {
            console.log(chalk.blue(`🛡️ Skipping protected file: ${file}`));
            continue;
          }
          
          const stats = fs.statSync(filePath);
          const fileAge = now - stats.mtime.getTime();
          
          if (fileAge > maxAge) {
            try {
              await fs.remove(filePath);
              console.log(chalk.gray(`🗑️ Removed old file: ${file} (${Math.round(fileAge / (60 * 60 * 1000))}h old)`));
              totalRemoved++;
            } catch (err) {
              console.error(chalk.red(`❌ Failed to remove old file ${filePath}: ${err.message}`));
            }
          }
        }
      }
      
      if (totalRemoved > 0) {
        console.log(chalk.green(`✅ Removed ${totalRemoved} old file(s)`));
      } else {
        console.log(chalk.gray(`✅ No old files to remove`));
      }
      
    } catch (err) {
      console.error(chalk.red(`❌ Error cleaning old files: ${err.message}`));
    }
  }

  /**
   * Clean unused music files
   */
  async cleanupUnusedMusic(maxMusicFiles = 10) {
    try {
      console.log(chalk.cyan(`🎵 Managing music files (max: ${maxMusicFiles})...`));
      
      if (!fs.existsSync(this.musicDir)) {
        return;
      }
      
      const musicFiles = fs.readdirSync(this.musicDir)
        .filter(file => (file.endsWith('.mp3') || file.endsWith('.wav')) && !file.endsWith('.part'))
        .map(file => {
          const filePath = path.join(this.musicDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            mtime: stats.mtime,
            size: stats.size
          };
        })
        .sort((a, b) => b.mtime - a.mtime); // Sort by newest first
      
      // Remove excess music files (keep only the newest ones)
      if (musicFiles.length > maxMusicFiles) {
        const filesToRemove = musicFiles.slice(maxMusicFiles);
        
        for (const file of filesToRemove) {
          try {
            // Skip protected files
            if (!this.isFileProtected(file.path)) {
              await fs.remove(file.path);
              console.log(chalk.gray(`🗑️ Removed old music: ${file.name}`));
            }
          } catch (err) {
            console.error(chalk.red(`❌ Failed to remove music ${file.path}: ${err.message}`));
          }
        }
        
        console.log(chalk.green(`✅ Removed ${filesToRemove.length} old music file(s)`));
      }
      
      // Remove duplicates in music directory
      await this.removeDuplicates(this.musicDir);
      
    } catch (err) {
      console.error(chalk.red(`❌ Error cleaning music files: ${err.message}`));
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats() {
    try {
      const stats = {
        raw: { count: 0, size: 0 },
        edited: { count: 0, size: 0 },
        music: { count: 0, size: 0 },
        total: { count: 0, size: 0 }
      };
      
      const directories = [
        { key: 'raw', path: this.rawDir },
        { key: 'edited', path: this.editedDir },
        { key: 'music', path: this.musicDir }
      ];
      
      for (const { key, path: dirPath } of directories) {
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath).filter(file => 
            !file.endsWith('.part') // Skip partial downloads
          );
          
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            const fileStats = fs.statSync(filePath);
            
            if (fileStats.isFile()) {
              stats[key].count++;
              stats[key].size += fileStats.size;
              stats.total.count++;
              stats.total.size += fileStats.size;
            }
          }
        }
      }
      
      // Convert bytes to MB
      Object.keys(stats).forEach(key => {
        stats[key].sizeMB = (stats[key].size / (1024 * 1024)).toFixed(2);
      });
      
      return stats;
    } catch (err) {
      console.error(chalk.red(`❌ Error getting storage stats: ${err.message}`));
      return null;
    }
  }

  /**
   * Comprehensive cleanup - run all cleanup operations - IMPROVED
   */
  async performFullCleanup() {
    try {
      console.log(chalk.cyan('🧹 Starting comprehensive cleanup...'));
      
      // Get initial stats
      const initialStats = await this.getStorageStats();
      if (initialStats) {
        console.log(chalk.gray(`📊 Initial storage: ${initialStats.total.sizeMB}MB (${initialStats.total.count} files)`));
      }
      
      // Remove duplicates (respecting protections)
      await this.removeDuplicates(this.rawDir);
      await this.removeDuplicates(this.editedDir);
      await this.removeDuplicates(this.musicDir);
      
      // Clean old files (older than 24 hours, respecting protections)
      await this.cleanupOldFiles(24);
      
      // Manage music files
      await this.cleanupUnusedMusic(8);
      
      // Get final stats
      const finalStats = await this.getStorageStats();
      if (finalStats && initialStats) {
        const savedMB = (initialStats.total.size - finalStats.total.size) / (1024 * 1024);
        const savedFiles = initialStats.total.count - finalStats.total.count;
        
        console.log(chalk.green(`✅ Cleanup completed!`));
        console.log(chalk.gray(`📊 Final storage: ${finalStats.total.sizeMB}MB (${finalStats.total.count} files)`));
        
        if (savedMB > 0) {
          console.log(chalk.green(`💾 Saved ${savedMB.toFixed(2)}MB by removing ${savedFiles} file(s)`));
        }
      }
      
    } catch (err) {
      console.error(chalk.red(`❌ Error in full cleanup: ${err.message}`));
    }
  }
}

module.exports = VideoCleanup;