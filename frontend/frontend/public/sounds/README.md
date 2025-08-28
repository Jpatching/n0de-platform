# Mines Game Sound Effects

This directory should contain the following sound files for the mines game:

## Required Sound Files (MP3 format):

### Tile Interaction Sounds
- `tile-click.mp3` - Subtle click when player clicks a tile
- `gem-reveal.mp3` - Satisfying chime when revealing a safe tile (gem)

### Mine Explosion Sounds  
- `mine-explosion.mp3` - Dramatic explosion sound when hitting a mine
- `mine-warning.mp3` - Brief warning/alarm sound before explosion

### Multiplier Sounds
- `multiplier-up.mp3` - Ascending tone when multiplier increases significantly
- `multiplier-pulse.mp3` - Subtle pulse for small multiplier increases

### Game State Sounds
- `round-start.mp3` - Energetic sound when a new round begins
- `round-win.mp3` - Victory sound when player wins a round
- `round-lose.mp3` - Defeat sound when player loses a round

### Cash Out Sounds
- `cash-out.mp3` - Standard cash out sound
- `big-win.mp3` - Celebratory sound for high multiplier cash outs (3x+)

### UI Sounds
- `button-click.mp3` - Subtle click for UI buttons
- `match-join.mp3` - Notification sound when joining a match

### Ambient Sounds
- `tension-build.mp3` - Background tension for high multipliers
- `heartbeat.mp3` - Subtle heartbeat for extreme tension

## Sound Design Guidelines:

- **Volume**: All sounds should be normalized to prevent jarring volume differences
- **Duration**: Keep sounds short (0.1-2 seconds) for responsiveness
- **Style**: Gambling/casino aesthetic - satisfying but not overwhelming
- **Format**: MP3 format for web compatibility
- **Quality**: 44.1kHz, 16-bit minimum quality

## Temporary Solution:

For development, you can:
1. Use free sound effects from freesound.org or similar
2. Create simple beep/tone sounds as placeholders
3. Record temporary sounds or use text-to-speech for testing

The audio system will gracefully handle missing files by logging warnings without breaking the game. 