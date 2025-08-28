// PV3 Game Assets CDN Worker
// Serves R2 assets publicly with CORS support

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Extract the object path from the URL
    const objectPath = url.pathname.slice(1); // Remove leading slash
    
    if (!objectPath) {
      return new Response('PV3 Game Assets CDN - Ready', { status: 200 });
    }
    
    try {
      // Get object from R2 bucket
      const object = await env.PV3_GAME_ASSETS.get(objectPath);
      
      if (!object) {
        return new Response('Asset not found', { status: 404 });
      }
      
      // Get the appropriate content type
      const contentType = getContentType(objectPath);
      
      // Create response with proper headers
      const response = new Response(object.body, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000', // 1 year cache
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'ETag': object.etag,
          'Last-Modified': object.uploaded.toUTCString(),
        },
      });
      
      return response;
      
    } catch (error) {
      console.error('Error serving asset:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};

function getContentType(path) {
  const ext = path.split('.').pop().toLowerCase();
  
  const contentTypes = {
    'mp3': 'audio/mpeg',
    'webp': 'image/webp',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'js': 'application/javascript',
    'css': 'text/css',
    'json': 'application/json',
    'woff2': 'font/woff2',
    'woff': 'font/woff',
    'ttf': 'font/ttf',
  };
  
  return contentTypes[ext] || 'application/octet-stream';
} 