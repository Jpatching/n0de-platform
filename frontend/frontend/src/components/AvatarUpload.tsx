'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import Avatar from './Avatar';

interface AvatarUploadProps {
  onSuccess?: () => void;
}

export default function AvatarUpload({ onSuccess }: AvatarUploadProps) {
  const { user, refreshUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app'}/api/v1`;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('pv3_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`${API_BASE}/uploads/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const data = await response.json();
      setSuccess('Avatar uploaded successfully!');
      
      // Refresh user data to get new avatar URL
      await refreshUser();
      
      // Clear preview after successful upload
      setTimeout(() => {
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 1000);

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const deleteAvatar = async () => {
    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('pv3_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE}/uploads/avatar`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Delete failed');
      }

      setSuccess('Avatar deleted successfully!');
      
      // Refresh user data to remove avatar URL
      await refreshUser();
      
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="text-2xl">🖼️</div>
        <h3 className="text-xl font-bold text-text-primary font-audiowide">Profile Picture</h3>
      </div>

      <div className="flex flex-col items-center space-y-4">
        {/* Avatar Display */}
        <div className="relative">
          {previewUrl ? (
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
              <Image
                src={previewUrl}
                alt="Avatar preview"
                width={128}
                height={128}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <Avatar user={user || undefined} size="2xl" showIcon={false} />
          )}
          
          {uploading && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Upload Instructions */}
        <div className="text-center">
          <p className="text-text-secondary text-sm font-inter mb-2">
            Upload a profile picture to personalize your account
          </p>
          <p className="text-text-muted text-xs font-inter">
            Supported formats: JPEG, PNG, GIF, WebP • Max size: 5MB
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={triggerFileInput}
            disabled={uploading}
            className="px-4 py-2 bg-accent-primary hover:bg-accent-primary/80 disabled:bg-surface-tertiary disabled:text-text-secondary text-black font-bold rounded-lg transition-colors font-inter"
          >
            {(user as any)?.avatar ? 'Change Picture' : 'Upload Picture'}
          </button>
          
          {(user as any)?.avatar && (
            <button
              onClick={deleteAvatar}
              disabled={uploading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-surface-tertiary disabled:text-text-secondary text-white font-bold rounded-lg transition-colors font-inter"
            >
              Remove
            </button>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Status Messages */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 w-full">
            <p className="text-red-400 text-sm font-inter text-center">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 w-full">
            <p className="text-green-400 text-sm font-inter text-center">{success}</p>
          </div>
        )}
      </div>
    </div>
  );
} 