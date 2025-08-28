import React, { useState } from 'react';

export default function SettingsPanel() {
  const [autoCashOut, setAutoCashOut] = useState('disabled');
  const [animationSpeed, setAnimationSpeed] = useState('normal');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [volume, setVolume] = useState(75);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-text-primary font-audiowide">⚙️ Game Settings</h3>
      
      <div className="grid grid-cols-1 gap-4">
        {/* Auto Settings */}
        <div className="bg-bg-card rounded-lg p-4">
          <h4 className="font-semibold text-text-primary mb-3">Auto Actions</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-text-secondary mb-2">Auto Cash Out</label>
              <select 
                value={autoCashOut}
                onChange={(e) => setAutoCashOut(e.target.value)}
                className="w-full px-3 py-2 bg-bg-main border border-border rounded-lg text-text-primary"
              >
                <option value="disabled">Disabled</option>
                <option value="2x">2.00x</option>
                <option value="3x">3.00x</option>
                <option value="5x">5.00x</option>
                <option value="10x">10.00x</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-2">Animation Speed</label>
              <select 
                value={animationSpeed}
                onChange={(e) => setAnimationSpeed(e.target.value)}
                className="w-full px-3 py-2 bg-bg-main border border-border rounded-lg text-text-primary"
              >
                <option value="slow">Slow</option>
                <option value="normal">Normal</option>
                <option value="fast">Fast</option>
                <option value="instant">Instant</option>
              </select>
            </div>
          </div>
        </div>

        {/* Audio Settings */}
        <div className="bg-bg-card rounded-lg p-4">
          <h4 className="font-semibold text-text-primary mb-3">Audio Settings</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Sound Effects</span>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`w-12 h-6 rounded-full ${soundEnabled ? 'bg-accent-primary' : 'bg-gray-600'} relative transition-colors`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Background Music</span>
              <button
                onClick={() => setMusicEnabled(!musicEnabled)}
                className={`w-12 h-6 rounded-full ${musicEnabled ? 'bg-accent-primary' : 'bg-gray-600'} relative transition-colors`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${musicEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-text-secondary">Volume</span>
                <span className="text-text-primary font-semibold">{volume}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={volume}
                onChange={(e) => setVolume(parseInt(e.target.value))}
                className="w-full h-2 bg-bg-main rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Visual Preferences */}
        <div className="bg-bg-card rounded-lg p-4">
          <h4 className="font-semibold text-text-primary mb-3">Visual Settings</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Tile Highlights</span>
              <input type="checkbox" defaultChecked className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Show Multiplier Pulse</span>
              <input type="checkbox" defaultChecked className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Particle Effects</span>
              <input type="checkbox" defaultChecked className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Performance */}
        <div className="bg-bg-card rounded-lg p-4">
          <h4 className="font-semibold text-text-primary mb-3">Performance</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-text-secondary block">Reduce Motion</span>
                <span className="text-xs text-text-secondary">For slower devices</span>
              </div>
              <input type="checkbox" className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-text-secondary block">Hardware Acceleration</span>
                <span className="text-xs text-text-secondary">Use GPU rendering</span>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <button className="w-full mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors">
          Reset All Settings
        </button>
      </div>
    </div>
  );
} 