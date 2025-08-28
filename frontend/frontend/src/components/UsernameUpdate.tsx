'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface UsernameUpdateProps {
  onSuccess?: () => void;
}

export default function UsernameUpdate({ onSuccess }: UsernameUpdateProps) {
  const { user, loading, refreshUser } = useAuth();
  const [newUsername, setNewUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const updateUsername = async (username: string) => {
    const token = localStorage.getItem('pv3_token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch('https://pv3-backend-api-production.up.railway.app/api/v1/user/update-username', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ username })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update username');
    }

    return response.json();
  };

  const validateUsername = (username: string): string | null => {
    if (!username) return 'Username is required';
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (username.length > 20) return 'Username must be less than 20 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateUsername(newUsername);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUpdating(true);
    setError('');
    setSuccess('');

    try {
      await updateUsername(newUsername);
      setSuccess('Username updated successfully! This was your one-time change.');
      setNewUsername('');
      
      // Refresh user data to ensure everything is in sync
      await refreshUser();
      
      // Give a small delay to ensure the UI updates
      setTimeout(() => {
        onSuccess?.();
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update username');
    } finally {
      setIsUpdating(false);
    }
  };

  // Don't show if user has already changed their username
  if ((user as any)?.usernameChanged) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="text-2xl">✅</div>
          <h3 className="text-xl font-bold text-text-primary font-audiowide">Username Set</h3>
        </div>
        <p className="text-text-secondary font-inter mb-4">
          Your username <span className="text-accent-primary font-semibold">{user?.username}</span> has been set and cannot be changed.
        </p>
        <div className="bg-accent-primary/10 border border-accent-primary/20 rounded-lg p-4">
          <p className="text-sm text-text-secondary font-inter">
            💡 <strong>One-time change policy:</strong> Each account can only change their username once to maintain consistency across games and leaderboards.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="text-2xl">✏️</div>
        <h3 className="text-xl font-bold text-text-primary font-audiowide">Update Username</h3>
      </div>
      
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
        <p className="text-sm text-text-secondary font-inter">
          ⚠️ <strong>One-time change only:</strong> You can only change your username once. Choose carefully as this will be permanent.
        </p>
      </div>

      <div className="mb-4">
        <p className="text-text-secondary font-inter mb-2">
          Current username: <span className="text-accent-primary font-semibold">{user?.username}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="newUsername" className="block text-sm font-medium text-text-primary mb-2 font-inter">
            New Username
          </label>
          <input
            type="text"
            id="newUsername"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Enter your new username"
            className="w-full px-4 py-3 bg-surface-secondary border border-surface-tertiary rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent font-inter"
            disabled={isUpdating || loading}
            maxLength={20}
          />
          <p className="text-xs text-text-secondary mt-1 font-inter">
            3-20 characters, letters, numbers, and underscores only
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p className="text-red-400 text-sm font-inter">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <p className="text-green-400 text-sm font-inter">{success}</p>
          </div>
        )}

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={isUpdating || loading || !newUsername.trim()}
            className="flex-1 bg-accent-primary hover:bg-accent-primary/80 disabled:bg-surface-tertiary disabled:text-text-secondary text-black font-bold py-3 px-6 rounded-lg transition-colors font-inter"
          >
            {isUpdating ? 'Updating...' : 'Update Username'}
          </button>
        </div>
      </form>
    </div>
  );
} 