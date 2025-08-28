// Utility functions for handling user display names based on privacy settings

export interface UserDisplayInfo {
  id: string;
  username?: string;
  displayName?: string | null;
  showUsername: boolean;
  profileVisibility: string;
  walletAddress?: string;
}

/**
 * Get the display name for a user based on their privacy settings
 * @param user - User object with display preferences
 * @param context - Context where the name will be displayed ('leaderboard', 'game', 'profile', etc.)
 * @param viewerIsOwner - Whether the viewer is the owner of the profile
 * @returns The appropriate display name
 */
export function getDisplayName(
  user: UserDisplayInfo, 
  context: 'leaderboard' | 'game' | 'profile' | 'chat' = 'leaderboard',
  viewerIsOwner: boolean = false
): string {
  // If viewer is the owner, always show their preferred name
  if (viewerIsOwner) {
    if (user.displayName && !user.showUsername) {
      return user.displayName;
    }
    if (user.username) {
      return user.username;
    }
    return user.walletAddress ? `${user.walletAddress.slice(0, 8)}...${user.walletAddress.slice(-4)}` : 'Unknown Player';
  }

  // Handle privacy settings
  switch (user.profileVisibility) {
    case 'private':
      return 'Anonymous Player';
    
    case 'friends':
      // TODO: Implement friend checking logic
      // For now, treat as anonymous in public contexts
      if (context === 'leaderboard' || context === 'game') {
        return 'Anonymous Player';
      }
      break;
    
    case 'public':
    default:
      break;
  }

  // For public profiles, determine name based on preferences
  if (user.showUsername && user.username) {
    return user.username;
  }
  
  if (user.displayName) {
    return user.displayName;
  }
  
  if (user.username) {
    return user.username;
  }
  
  // Fallback to wallet address
  return user.walletAddress ? `${user.walletAddress.slice(0, 8)}...${user.walletAddress.slice(-4)}` : 'Unknown Player';
}

/**
 * Get a shortened version of the display name for compact displays
 * @param user - User object with display preferences
 * @param maxLength - Maximum length of the returned name
 * @param context - Context where the name will be displayed
 * @param viewerIsOwner - Whether the viewer is the owner of the profile
 * @returns Shortened display name
 */
export function getShortDisplayName(
  user: UserDisplayInfo, 
  maxLength: number = 20,
  context: 'leaderboard' | 'game' | 'profile' | 'chat' = 'leaderboard',
  viewerIsOwner: boolean = false
): string {
  const fullName = getDisplayName(user, context, viewerIsOwner);
  
  if (fullName.length <= maxLength) {
    return fullName;
  }
  
  return `${fullName.slice(0, maxLength - 3)}...`;
}

/**
 * Get display name with additional context (like rank or level)
 * @param user - User object with display preferences
 * @param additionalInfo - Additional info to append (like rank, level, etc.)
 * @param context - Context where the name will be displayed
 * @param viewerIsOwner - Whether the viewer is the owner of the profile
 * @returns Display name with additional context
 */
export function getDisplayNameWithContext(
  user: UserDisplayInfo & { rank?: number; level?: number; reputation?: number },
  additionalInfo?: string,
  context: 'leaderboard' | 'game' | 'profile' | 'chat' = 'leaderboard',
  viewerIsOwner: boolean = false
): string {
  const displayName = getDisplayName(user, context, viewerIsOwner);
  
  if (additionalInfo) {
    return `${displayName} ${additionalInfo}`;
  }
  
  // Auto-generate context based on available data
  const contextParts: string[] = [];
  
  if (user.rank) {
    contextParts.push(`#${user.rank}`);
  }
  
  if (user.level) {
    contextParts.push(`Lv.${user.level}`);
  }
  
  if (contextParts.length > 0) {
    return `${displayName} (${contextParts.join(' • ')})`;
  }
  
  return displayName;
}

/**
 * Check if a user's profile is visible to the viewer
 * @param user - User object with privacy settings
 * @param viewerIsOwner - Whether the viewer is the owner of the profile
 * @param viewerIsFriend - Whether the viewer is a friend (TODO: implement friend system)
 * @returns Whether the profile should be visible
 */
export function isProfileVisible(
  user: UserDisplayInfo,
  viewerIsOwner: boolean = false,
  viewerIsFriend: boolean = false
): boolean {
  if (viewerIsOwner) {
    return true;
  }
  
  switch (user.profileVisibility) {
    case 'private':
      return false;
    case 'friends':
      return viewerIsFriend;
    case 'public':
    default:
      return true;
  }
} 