const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const Redis = require('redis');

const app = express();
const port = 3001;

// Redis client for stream coordination
const redis = Redis.createClient({
  host: process.env.REDIS_HOST || 'redis-streaming',
  port: process.env.REDIS_PORT || 6379,
});

redis.on('error', (err) => {
  console.error('Redis Client Error', err);
});

redis.connect();

// Configuration
const RTMP_URL = process.env.RTMP_URL || 'rtmp://nginx-rtmp:1935/live';
const HLS_OUTPUT_PATH = process.env.HLS_OUTPUT_PATH || '/hls';
const THUMBNAIL_PATH = process.env.THUMBNAIL_PATH || '/thumbnails';
const RECORDINGS_PATH = process.env.RECORDINGS_PATH || '/recordings';

// Active stream processes
const activeStreams = new Map();

// Middleware
app.use(express.json());

/**
 * Start processing a stream
 */
app.post('/process/:streamKey', async (req, res) => {
  const { streamKey } = req.params;
  const { qualities = ['720p', '480p', '360p'] } = req.body;

  try {
    if (activeStreams.has(streamKey)) {
      return res.status(400).json({ error: 'Stream already being processed' });
    }

    console.log(`Starting processing for stream: ${streamKey}`);

    // Create output directories
    const streamOutputPath = path.join(HLS_OUTPUT_PATH, streamKey);
    const streamThumbnailPath = path.join(THUMBNAIL_PATH, streamKey);
    
    if (!fs.existsSync(streamOutputPath)) {
      fs.mkdirSync(streamOutputPath, { recursive: true });
    }
    
    if (!fs.existsSync(streamThumbnailPath)) {
      fs.mkdirSync(streamThumbnailPath, { recursive: true });
    }

    // Start FFmpeg processes for different qualities
    const processes = [];

    // Master playlist process
    const masterProcess = startMasterPlaylistProcess(streamKey, qualities);
    processes.push(masterProcess);

    // Quality-specific processes
    for (const quality of qualities) {
      const qualityProcess = startQualityProcess(streamKey, quality);
      processes.push(qualityProcess);
    }

    // Thumbnail generation process
    const thumbnailProcess = startThumbnailProcess(streamKey);
    processes.push(thumbnailProcess);

    // Store active processes
    activeStreams.set(streamKey, {
      processes,
      startTime: Date.now(),
      qualities,
    });

    // Update Redis with stream status
    await redis.hSet(`stream:${streamKey}`, {
      status: 'processing',
      startTime: Date.now(),
      qualities: JSON.stringify(qualities),
    });

    res.json({
      success: true,
      streamKey,
      qualities,
      playlistUrl: `${HLS_OUTPUT_PATH}/${streamKey}/master.m3u8`,
    });

  } catch (error) {
    console.error(`Error starting stream processing: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Stop processing a stream
 */
app.delete('/process/:streamKey', async (req, res) => {
  const { streamKey } = req.params;

  try {
    if (!activeStreams.has(streamKey)) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    console.log(`Stopping processing for stream: ${streamKey}`);

    const streamData = activeStreams.get(streamKey);
    
    // Kill all processes
    streamData.processes.forEach(process => {
      if (process && !process.killed) {
        process.kill('SIGTERM');
      }
    });

    // Remove from active streams
    activeStreams.delete(streamKey);

    // Update Redis
    await redis.hSet(`stream:${streamKey}`, {
      status: 'stopped',
      endTime: Date.now(),
    });

    // Clean up old HLS segments (keep last 10 minutes)
    setTimeout(() => {
      cleanupOldSegments(streamKey);
    }, 60000); // Wait 1 minute before cleanup

    res.json({ success: true, streamKey });

  } catch (error) {
    console.error(`Error stopping stream processing: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get stream status
 */
app.get('/status/:streamKey', async (req, res) => {
  const { streamKey } = req.params;

  try {
    const streamData = activeStreams.get(streamKey);
    const redisData = await redis.hGetAll(`stream:${streamKey}`);

    res.json({
      active: !!streamData,
      streamKey,
      ...redisData,
      uptime: streamData ? Date.now() - streamData.startTime : 0,
    });

  } catch (error) {
    console.error(`Error getting stream status: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    activeStreams: activeStreams.size,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

/**
 * Start master playlist process
 */
function startMasterPlaylistProcess(streamKey, qualities) {
  const outputPath = path.join(HLS_OUTPUT_PATH, streamKey, 'master.m3u8');
  
  // Create master playlist content
  let masterPlaylist = '#EXTM3U\n#EXT-X-VERSION:3\n';
  
  const qualitySettings = {
    '720p': { bandwidth: 1000000, resolution: '1280x720' },
    '480p': { bandwidth: 500000, resolution: '854x480' },
    '360p': { bandwidth: 250000, resolution: '640x360' },
  };

  qualities.forEach(quality => {
    const settings = qualitySettings[quality];
    if (settings) {
      masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${settings.bandwidth},RESOLUTION=${settings.resolution}\n`;
      masterPlaylist += `${quality}/index.m3u8\n`;
    }
  });

  fs.writeFileSync(outputPath, masterPlaylist);
  
  console.log(`Created master playlist for ${streamKey}`);
  return { kill: () => {} }; // Dummy process for consistency
}

/**
 * Start quality-specific transcoding process
 */
function startQualityProcess(streamKey, quality) {
  const inputUrl = `${RTMP_URL}/${streamKey}`;
  const outputPath = path.join(HLS_OUTPUT_PATH, streamKey, quality);
  
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  const qualitySettings = {
    '720p': ['-vf', 'scale=1280:720', '-b:v', '1000k', '-b:a', '128k'],
    '480p': ['-vf', 'scale=854:480', '-b:v', '500k', '-b:a', '96k'],
    '360p': ['-vf', 'scale=640:360', '-b:v', '250k', '-b:a', '64k'],
  };

  const settings = qualitySettings[quality] || qualitySettings['360p'];

  const ffmpegArgs = [
    '-i', inputUrl,
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-preset', 'veryfast',
    '-tune', 'zerolatency',
    ...settings,
    '-f', 'hls',
    '-hls_time', '2',
    '-hls_list_size', '10',
    '-hls_flags', 'delete_segments',
    '-hls_segment_filename', path.join(outputPath, 'segment_%03d.ts'),
    path.join(outputPath, 'index.m3u8')
  ];

  console.log(`Starting ${quality} transcoding for ${streamKey}`);
  
  const process = spawn('ffmpeg', ffmpegArgs);

  process.stdout.on('data', (data) => {
    console.log(`FFmpeg ${quality} stdout: ${data}`);
  });

  process.stderr.on('data', (data) => {
    console.log(`FFmpeg ${quality} stderr: ${data}`);
  });

  process.on('close', (code) => {
    console.log(`FFmpeg ${quality} process for ${streamKey} exited with code ${code}`);
  });

  return process;
}

/**
 * Start thumbnail generation process
 */
function startThumbnailProcess(streamKey) {
  const inputUrl = `${RTMP_URL}/${streamKey}`;
  const outputPath = path.join(THUMBNAIL_PATH, streamKey);

  const ffmpegArgs = [
    '-i', inputUrl,
    '-vf', 'fps=1/10,scale=320:180',
    '-f', 'image2',
    '-strftime', '1',
    path.join(outputPath, 'thumb_%Y%m%d_%H%M%S.jpg')
  ];

  console.log(`Starting thumbnail generation for ${streamKey}`);
  
  const process = spawn('ffmpeg', ffmpegArgs);

  process.stdout.on('data', (data) => {
    console.log(`Thumbnail stdout: ${data}`);
  });

  process.stderr.on('data', (data) => {
    console.log(`Thumbnail stderr: ${data}`);
  });

  process.on('close', (code) => {
    console.log(`Thumbnail process for ${streamKey} exited with code ${code}`);
  });

  return process;
}

/**
 * Clean up old HLS segments
 */
function cleanupOldSegments(streamKey) {
  const streamPath = path.join(HLS_OUTPUT_PATH, streamKey);
  
  if (!fs.existsSync(streamPath)) {
    return;
  }

  try {
    // Remove old segments (keep only recent ones)
    const qualities = ['720p', '480p', '360p'];
    
    qualities.forEach(quality => {
      const qualityPath = path.join(streamPath, quality);
      if (fs.existsSync(qualityPath)) {
        const files = fs.readdirSync(qualityPath);
        const segmentFiles = files.filter(file => file.endsWith('.ts'));
        
        // Keep only the last 30 segments (1 minute at 2s per segment)
        if (segmentFiles.length > 30) {
          const filesToDelete = segmentFiles
            .sort()
            .slice(0, segmentFiles.length - 30);
          
          filesToDelete.forEach(file => {
            const filePath = path.join(qualityPath, file);
            fs.unlinkSync(filePath);
          });
          
          console.log(`Cleaned up ${filesToDelete.length} old segments for ${streamKey}/${quality}`);
        }
      }
    });
  } catch (error) {
    console.error(`Error cleaning up segments for ${streamKey}: ${error.message}`);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  
  // Stop all active streams
  for (const [streamKey, streamData] of activeStreams) {
    console.log(`Stopping stream: ${streamKey}`);
    streamData.processes.forEach(process => {
      if (process && !process.killed) {
        process.kill('SIGTERM');
      }
    });
  }
  
  // Close Redis connection
  await redis.quit();
  
  process.exit(0);
});

// Start server
app.listen(port, () => {
  console.log(`FFmpeg processor service running on port ${port}`);
  console.log(`RTMP URL: ${RTMP_URL}`);
  console.log(`HLS Output: ${HLS_OUTPUT_PATH}`);
  console.log(`Thumbnails: ${THUMBNAIL_PATH}`);
}); 