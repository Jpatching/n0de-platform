'use client';

import { User } from 'lucide-react';

interface AvatarProps {
  user?: {
    avatar?: string;
    username?: string;
    email?: string;
    displayName?: string;
  };
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showIcon?: boolean;
}

export default function Avatar({ 
  user, 
  size = 'md', 
  className = '', 
  showIcon = true 
}: AvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-20 h-20',
    '2xl': 'w-32 h-32',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
    '2xl': 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
    xl: 'text-3xl',
    '2xl': 'text-5xl',
  };

  const getInitials = () => {
    if (user?.displayName) {
      return user.displayName.slice(0, 2).toUpperCase();
    }
    if (user?.username) {
      return user.username.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className={`${sizeClasses[size]} bg-gradient-to-br from-accent-primary to-accent-secondary rounded-full flex items-center justify-center overflow-hidden ${className}`}>
      {user?.avatar ? (
        <img
          src={user.avatar}
          alt="Avatar"
          className="w-full h-full object-cover"
        />
      ) : showIcon ? (
        <User className={`${iconSizes[size]} text-black`} />
      ) : (
        <span className={`${textSizes[size]} font-bold text-black font-audiowide`}>
          {getInitials()}
        </span>
      )}
    </div>
  );
} 