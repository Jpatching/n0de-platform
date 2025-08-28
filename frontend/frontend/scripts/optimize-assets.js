#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

// Set FFmpeg binary path
ffmpeg.setFfmpegPath(ffmpegStatic);

// 🚀 PHASE 1: Asset Optimization Script
console.log('🚀 PV3 Performance Optimization - Phase 1 Starting...\n');

// Directories to optimize
const LOGO_DIR = path.join(__dirname, '../public/logos');
const GAME_COVERS_DIR = path.join(__dirname, '../public/game-covers');
const SOUNDS_DIR = path.join(__dirname, '../public/sounds');

// WebP optimization settings
const WEBP_SETTINGS = {
  quality: 85,
  effort: 6, // Max compression effort
  lossless: false
};

// Video optimization settings
const VIDEO_SETTINGS = {
  webm: {
    videoBitrate: '800k',
    audioBitrate: '128k',
    format: 'webm',
    videoCodec: 'libvpx-vp9',
    audioCodec: 'libvorbis'
  }
};

// Track optimization results
let optimizationResults = {
  images: { original: 0, optimized: 0, savings: 0 },
  videos: { original: 0, optimized: 0, savings: 0 },
  audio: { original: 0, optimized: 0, savings: 0 }
};

// Utility functions
function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch (error) {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 1. IMAGE OPTIMIZATION
async function optimizeImages() {
  console.log('📸 Optimizing images to WebP format...');
  
  if (!fs.existsSync(LOGO_DIR)) {
    console.log('⚠️  Logos directory not found, skipping image optimization');
    return;
  }

  const imageFiles = fs.readdirSync(LOGO_DIR).filter(file => 
    file.match(/\.(png|jpg|jpeg)$/i)
  );

  for (const file of imageFiles) {
    const inputPath = path.join(LOGO_DIR, file);
    const outputPath = path.join(LOGO_DIR, file.replace(/\.(png|jpg|jpeg)$/i, '.webp'));
    
    try {
      const originalSize = getFileSize(inputPath);
      
      await sharp(inputPath)
        .webp(WEBP_SETTINGS)
        .toFile(outputPath);
      
      const optimizedSize = getFileSize(outputPath);
      const savings = originalSize - optimizedSize;
      const savingsPercent = ((savings / originalSize) * 100).toFixed(1);
      
      optimizationResults.images.original += originalSize;
      optimizationResults.images.optimized += optimizedSize;
      optimizationResults.images.savings += savings;
      
      console.log(`✅ ${file} → ${path.basename(outputPath)}`);
      console.log(`   ${formatBytes(originalSize)} → ${formatBytes(optimizedSize)} (${savingsPercent}% savings)`);
      
    } catch (error) {
      console.error(`❌ Failed to optimize ${file}:`, error.message);
    }
  }
}

// 2. VIDEO OPTIMIZATION
async function optimizeVideos() {
  console.log('\n🎬 Optimizing videos to WebM format...');
  
  if (!fs.existsSync(GAME_COVERS_DIR)) {
    console.log('⚠️  Game covers directory not found, skipping video optimization');
    return;
  }

  const videoFiles = fs.readdirSync(GAME_COVERS_DIR).filter(file => 
    file.match(/\.mp4$/i)
  );

  console.log(`Found ${videoFiles.length} videos to optimize...`);

  for (const file of videoFiles) {
    const inputPath = path.join(GAME_COVERS_DIR, file);
    const outputPath = path.join(GAME_COVERS_DIR, file.replace(/\.mp4$/i, '.webm'));
    
    try {
      const originalSize = getFileSize(inputPath);
      
      console.log(`🔄 Converting ${file}...`);
      
      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .videoCodec('libvpx-vp9')
          .audioCodec('libvorbis')
          .videoBitrate('800k')
          .audioBitrate('128k')
          .outputOptions([
            '-crf 30',
            '-b:v 0',
            '-deadline realtime',
            '-cpu-used 8'
          ])
          .output(outputPath)
          .on('start', (commandLine) => {
            console.log(`   🎬 Processing: ${file}`);
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              process.stdout.write(`   📊 Progress: ${Math.round(progress.percent)}%\r`);
            }
          })
          .on('end', () => {
            console.log(`\n   ✅ Completed: ${file}`);
            resolve();
          })
          .on('error', (err) => {
            console.error(`\n   ❌ Error: ${err.message}`);
            reject(err);
          })
          .run();
      });
      
      const optimizedSize = getFileSize(outputPath);
      const savings = originalSize - optimizedSize;
      const savingsPercent = ((savings / originalSize) * 100).toFixed(1);
      
      optimizationResults.videos.original += originalSize;
      optimizationResults.videos.optimized += optimizedSize;
      optimizationResults.videos.savings += savings;
      
      console.log(`✅ ${file} → ${path.basename(outputPath)}`);
      console.log(`   ${formatBytes(originalSize)} → ${formatBytes(optimizedSize)} (${savingsPercent}% savings)\n`);
      
    } catch (error) {
      console.error(`❌ Failed to optimize ${file}:`, error.message);
    }
  }
}

// 3. AUDIO OPTIMIZATION (Audio Sprites)
async function optimizeAudio() {
  console.log('\n🎵 Creating audio sprites...');
  
  if (!fs.existsSync(SOUNDS_DIR)) {
    console.log('⚠️  Sounds directory not found, skipping audio optimization');
    return;
  }

  const audioFiles = fs.readdirSync(SOUNDS_DIR).filter(file => 
    file.match(/\.(mp3|wav|ogg)$/i) && !file.includes('sprite')
  );

  if (audioFiles.length === 0) {
    console.log('⚠️  No audio files found for sprite creation');
    return;
  }

  // Create audio map for JavaScript
  const audioMap = {};
  let currentPosition = 0;

  console.log(`🔄 Processing ${audioFiles.length} audio files...`);

  // Get actual audio durations using FFmpeg
  const audioData = [];
  for (const file of audioFiles) {
    const filePath = path.join(SOUNDS_DIR, file);
    const originalSize = getFileSize(filePath);
    optimizationResults.audio.original += originalSize;
    
    try {
      // Get actual duration using FFmpeg probe
      const duration = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) {
            console.warn(`⚠️  Could not get duration for ${file}, using default 2s`);
            resolve(2.0);
          } else {
            const duration = metadata.format.duration || 2.0;
            resolve(Math.ceil(duration * 10) / 10); // Round up to nearest 0.1s
          }
        });
      });

      const fileName = path.basename(file, path.extname(file));
      audioMap[fileName] = {
        start: currentPosition,
        duration: duration,
        end: currentPosition + duration
      };
      
      audioData.push({
        file: filePath,
        name: fileName,
        duration: duration,
        start: currentPosition
      });
      
      currentPosition += duration + 0.1; // Add 0.1s buffer between sounds
      
      console.log(`   ✅ ${fileName}: ${duration}s (starts at ${audioData[audioData.length - 1].start}s)`);
      
    } catch (error) {
      console.error(`❌ Failed to process ${file}:`, error.message);
    }
  }

  // Create the audio map file
  const audioMapPath = path.join(SOUNDS_DIR, 'audio-sprite-map.json');
  fs.writeFileSync(audioMapPath, JSON.stringify(audioMap, null, 2));
  
  console.log(`✅ Audio sprite map created: ${audioMapPath}`);
  console.log(`📝 Audio files mapped: ${Object.keys(audioMap).length}`);
  console.log(`⏱️  Total sprite duration: ${currentPosition.toFixed(1)}s`);

  // Create actual audio sprite file
  if (audioData.length > 0) {
    const spriteOutputPath = path.join(SOUNDS_DIR, 'game-sounds-sprite.webm');
    const mp3OutputPath = path.join(SOUNDS_DIR, 'game-sounds-sprite.mp3');
    
    try {
      console.log('🔄 Creating audio sprite files...');
      
      // Create input list for FFmpeg concat
      const concatListPath = path.join(SOUNDS_DIR, 'temp-concat-list.txt');
      const concatContent = audioData.map(audio => {
        // Create silent padding if needed
        return `file '${audio.file.replace(/'/g, "'\\''")}'\n`;
      }).join('');
      
      fs.writeFileSync(concatListPath, concatContent);

      // Create WebM version (for modern browsers)
      await new Promise((resolve, reject) => {
        const command = ffmpeg()
          .input(concatListPath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .audioCodec('libvorbis')
          .audioBitrate('128k')
          .audioChannels(2)
          .audioFrequency(44100)
          .output(spriteOutputPath)
          .on('start', (commandLine) => {
            console.log('   🎵 Creating WebM sprite...');
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              process.stdout.write(`   📊 WebM Progress: ${Math.round(progress.percent)}%\r`);
            }
          })
          .on('end', () => {
            console.log('\n   ✅ WebM sprite created');
            resolve();
          })
          .on('error', (err) => {
            console.error(`\n   ❌ WebM creation failed: ${err.message}`);
            reject(err);
          });
        
        command.run();
      });

      // Create MP3 version (for Safari fallback)
      await new Promise((resolve, reject) => {
        const command = ffmpeg()
          .input(concatListPath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .audioChannels(2)
          .audioFrequency(44100)
          .output(mp3OutputPath)
          .on('start', (commandLine) => {
            console.log('   🎵 Creating MP3 sprite...');
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              process.stdout.write(`   📊 MP3 Progress: ${Math.round(progress.percent)}%\r`);
            }
          })
          .on('end', () => {
            console.log('\n   ✅ MP3 sprite created');
            resolve();
          })
          .on('error', (err) => {
            console.error(`\n   ❌ MP3 creation failed: ${err.message}`);
            reject(err);
          });
        
        command.run();
      });

      // Clean up temporary file
      fs.unlinkSync(concatListPath);

      const webmSize = getFileSize(spriteOutputPath);
      const mp3Size = getFileSize(mp3OutputPath);
      optimizationResults.audio.optimized = webmSize + mp3Size;
      
      console.log(`✅ Audio sprites created:`);
      console.log(`   WebM: ${formatBytes(webmSize)}`);
      console.log(`   MP3:  ${formatBytes(mp3Size)}`);
      
      // Create TypeScript utility file for audio sprite usage
      const utilityCode = `// Auto-generated audio sprite utility
export interface AudioSpriteMap {
  [key: string]: {
    start: number;
    duration: number;
    end: number;
  };
}

export const audioSpriteMap: AudioSpriteMap = ${JSON.stringify(audioMap, null, 2)};

export class AudioSpritePlayer {
  private audio: HTMLAudioElement;
  private isLoaded = false;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    
    // Try WebM first, fallback to MP3
    if (this.audio.canPlayType('audio/webm; codecs=vorbis')) {
      this.audio.src = '/sounds/game-sounds-sprite.webm';
    } else {
      this.audio.src = '/sounds/game-sounds-sprite.mp3';
    }
    
    this.audio.addEventListener('canplaythrough', () => {
      this.isLoaded = true;
    });
  }

  async play(soundName: string, volume = 1.0): Promise<void> {
    if (!this.isLoaded) {
      console.warn('Audio sprite not loaded yet');
      return;
    }

    const soundData = audioSpriteMap[soundName];
    if (!soundData) {
      console.warn(\`Sound '\${soundName}' not found in sprite\`);
      return;
    }

    return new Promise((resolve) => {
      this.audio.currentTime = soundData.start;
      this.audio.volume = Math.max(0, Math.min(1, volume));
      
      const onTimeUpdate = () => {
        if (this.audio.currentTime >= soundData.end) {
          this.audio.pause();
          this.audio.removeEventListener('timeupdate', onTimeUpdate);
          resolve();
        }
      };
      
      this.audio.addEventListener('timeupdate', onTimeUpdate);
      this.audio.play().catch(console.error);
    });
  }

  preload(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isLoaded) {
        resolve();
      } else {
        this.audio.addEventListener('canplaythrough', () => resolve(), { once: true });
      }
    });
  }
}

// Export singleton instance
export const audioSprite = new AudioSpritePlayer();`;

      const utilityPath = path.join(__dirname, '../src/lib/audioSprite.ts');
      fs.writeFileSync(utilityPath, utilityCode);
      console.log(`✅ Audio sprite utility created: ${utilityPath}`);
      
    } catch (error) {
      console.error('❌ Audio sprite creation failed:', error.message);
    }
  }
}

// 4. UPDATE REFERENCES
function updateImageReferences() {
  console.log('\n🔄 Creating reference update guide...');
  
  const updateGuide = `
# Image Reference Updates Required

After Phase 1 optimization, update these files to use WebP images:

## Logo References to Update:
- Update components to use .webp versions
- Add fallback support for older browsers
- Update imports in component files

## Example Update Pattern:
\`\`\`typescript
// Before
<img src="/logos/phantom.png" alt="Phantom" />

// After (with fallback)
<picture>
  <source srcSet="/logos/phantom.webp" type="image/webp" />
  <img src="/logos/phantom.png" alt="Phantom" />
</picture>
\`\`\`

## Video References to Update:
- Update coverVideo paths in game components
- Add WebM support with MP4 fallback

## Audio References to Update:
- Update audio imports to use sprite system
- Implement audio sprite player utility
`;

  fs.writeFileSync(path.join(__dirname, '../OPTIMIZATION_GUIDE.md'), updateGuide);
  console.log('✅ Reference update guide created: OPTIMIZATION_GUIDE.md');
}

// Main execution
async function main() {
  try {
    await optimizeImages();
    await optimizeVideos();
    await optimizeAudio();
    updateImageReferences();
    
    // Print final results
    console.log('\n🎉 Phase 1 Optimization Complete!\n');
    
    console.log('📊 Optimization Results:');
    console.log('========================');
    
    if (optimizationResults.images.original > 0) {
      const imageSavingsPercent = ((optimizationResults.images.savings / optimizationResults.images.original) * 100).toFixed(1);
      console.log(`Images: ${formatBytes(optimizationResults.images.original)} → ${formatBytes(optimizationResults.images.optimized)} (${imageSavingsPercent}% savings)`);
    }
    
    if (optimizationResults.videos.original > 0) {
      const videoSavingsPercent = ((optimizationResults.videos.savings / optimizationResults.videos.original) * 100).toFixed(1);
      console.log(`Videos: ${formatBytes(optimizationResults.videos.original)} → ${formatBytes(optimizationResults.videos.optimized)} (${videoSavingsPercent}% savings)`);
    }
    
    const totalOriginal = optimizationResults.images.original + optimizationResults.videos.original + optimizationResults.audio.original;
    const totalOptimized = optimizationResults.images.optimized + optimizationResults.videos.optimized + optimizationResults.audio.optimized;
    const totalSavings = totalOriginal - totalOptimized;
    const totalSavingsPercent = totalOriginal > 0 ? ((totalSavings / totalOriginal) * 100).toFixed(1) : 0;
    
    console.log(`\nTotal: ${formatBytes(totalOriginal)} → ${formatBytes(totalOptimized)} (${totalSavingsPercent}% savings)`);
    console.log(`\n💾 Total bandwidth savings: ${formatBytes(totalSavings)}`);
    
    console.log('\n📋 Next Steps:');
    console.log('1. Update component references to use WebP images');
    console.log('2. Add WebM video support with MP4 fallbacks');
    console.log('3. Implement audio sprite system');
    console.log('4. Test on different browsers and devices');
    console.log('5. Deploy and measure performance improvements');
    
  } catch (error) {
    console.error('❌ Optimization failed:', error);
    process.exit(1);
  }
}

// Run the optimization
main(); 