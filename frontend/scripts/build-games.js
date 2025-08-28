const fs = require('fs-extra');
const path = require('path');

async function buildGames() {
  const frontendDir = './frontend';
  const distDir = './dist';
  
  console.log('🎮 Building PV3 games for Cloudflare Pages...');
  
  // Clean dist directory
  await fs.emptyDir(distDir);
  console.log('✅ Cleaned dist directory');
  
  // Copy each game to dist
  const games = ['crash', 'mines', 'dice-duel', 'coinflip', 'rps', 'chess'];
  
  for (const game of games) {
    try {
      const srcGameDir = path.join(frontendDir, 'src', 'app', 'games', game);
      const destGameDir = path.join(distDir, game);
      
      if (await fs.pathExists(srcGameDir)) {
        // Copy game files
        await fs.copy(srcGameDir, destGameDir);
        console.log(`✅ Copied ${game} to dist`);
        
        // Create a simple index.html for each game if it doesn't exist
        const indexPath = path.join(destGameDir, 'index.html');
        if (!await fs.pathExists(indexPath)) {
          const gameIndexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${game.charAt(0).toUpperCase() + game.slice(1)} - PV3 Gaming</title>
    <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        .game-container { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; }
        .game-frame { width: 100%; height: 100%; border: none; }
    </style>
</head>
<body>
    <div class="game-container">
        <iframe class="game-frame" src="https://pv3-gaming.vercel.app/games/${game}" title="${game} Game"></iframe>
    </div>
</body>
</html>`;
          await fs.writeFile(indexPath, gameIndexHtml);
          console.log(`✅ Created index.html for ${game}`);
        }
      } else {
        console.log(`⚠️  Game directory not found: ${srcGameDir}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${game}:`, error.message);
    }
  }
  
  // Copy static assets
  const assetsDir = path.join(frontendDir, 'public');
  const distAssetsDir = path.join(distDir, 'assets');
  
  if (await fs.pathExists(assetsDir)) {
    await fs.copy(assetsDir, distAssetsDir);
    console.log('✅ Copied static assets');
  }
  
  // Create redirect rules for Cloudflare Pages
  const redirects = games.map(game => `/${game}/* /${game}/index.html 200`).join('\n');
  const redirectsContent = `
# Game redirects
${redirects}

# Fallback to main app
/* https://pv3-gaming.vercel.app/:splat 200
`;
  
  await fs.writeFile(path.join(distDir, '_redirects'), redirectsContent);
  console.log('✅ Created redirect rules');
  
  // Create a main index.html
  const mainIndexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PV3 Games - Web3 Gaming Platform</title>
    <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: #000; color: #fff; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .games-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .game-card { background: #111; border: 2px solid #333; border-radius: 10px; padding: 20px; text-align: center; }
        .game-card:hover { border-color: #00ff00; }
        .game-link { color: #00ff00; text-decoration: none; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎮 PV3 Games</h1>
            <p>High-performance gaming on Cloudflare Pages</p>
        </div>
        <div class="games-grid">
            ${games.map(game => `
            <div class="game-card">
                <h3>${game.charAt(0).toUpperCase() + game.slice(1).replace('-', ' ')}</h3>
                <a href="/${game}" class="game-link">Play Now</a>
            </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
  
  await fs.writeFile(path.join(distDir, 'index.html'), mainIndexHtml);
  console.log('✅ Created main index.html');
  
  console.log('🚀 Build complete! Ready for Cloudflare Pages deployment');
}

buildGames().catch(console.error); 