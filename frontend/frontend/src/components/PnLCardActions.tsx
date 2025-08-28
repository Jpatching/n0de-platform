import React, { useState, useEffect } from 'react';
import { Heart, Plus, MoreHorizontal, Trash2, FolderPlus } from 'lucide-react';

interface Collection {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  _count: { cards: number };
}

interface PnLCardActionsProps {
  cardId: string;
  onFavoriteChange?: (isFavorited: boolean) => void;
  onCollectionChange?: () => void;
}

export const PnLCardActions: React.FC<PnLCardActionsProps> = ({
  cardId,
  onFavoriteChange,
  onCollectionChange
}) => {
  const [isFavorited, setIsFavorited] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [showCollectionMenu, setShowCollectionMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkFavoriteStatus();
    loadCollections();
  }, [cardId]);

  const checkFavoriteStatus = async () => {
    try {
      const response = await fetch(`/api/v1/pnl/favorites/check/${cardId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('pv3_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setIsFavorited(data.isFavorited);
      }
    } catch (error) {
      console.error('Failed to check favorite status:', error);
    }
  };

  const loadCollections = async () => {
    try {
      const response = await fetch('/api/v1/pnl/favorites/collections', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('pv3_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCollections(data);
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  };

  const toggleFavorite = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const endpoint = isFavorited ? 'remove' : 'add';
      const response = await fetch(`/api/v1/pnl/favorites/${endpoint}/${cardId}`, {
        method: isFavorited ? 'DELETE' : 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('pv3_token')}`
        }
      });

      if (response.ok) {
        const newStatus = !isFavorited;
        setIsFavorited(newStatus);
        onFavoriteChange?.(newStatus);
      } else {
        console.error('Failed to toggle favorite');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCollection = async (collectionId: string) => {
    if (loading) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/v1/pnl/favorites/collections/${collectionId}/cards/${cardId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('pv3_token')}`
        }
      });

      if (response.ok) {
        onCollectionChange?.();
        setShowCollectionMenu(false);
        setShowActionsMenu(false);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to add to collection');
      }
    } catch (error) {
      console.error('Error adding to collection:', error);
      alert('Failed to add to collection');
    } finally {
      setLoading(false);
    }
  };

  const createNewCollection = async () => {
    const name = prompt('Enter collection name:');
    if (!name?.trim()) return;

    const description = prompt('Enter collection description (optional):');

    try {
      const response = await fetch('/api/v1/pnl/favorites/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('pv3_token')}`
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description?.trim() || undefined,
          isPublic: false
        })
      });

      if (response.ok) {
        const newCollection = await response.json();
        setCollections([newCollection, ...collections]);
        
        // Immediately add card to new collection
        await addToCollection(newCollection.id);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create collection');
      }
    } catch (error) {
      console.error('Error creating collection:', error);
      alert('Failed to create collection');
    }
  };

  return (
    <div className="relative">
      {/* Main Actions Row */}
      <div className="flex items-center space-x-2">
        {/* Favorite Button */}
        <button
          onClick={toggleFavorite}
          disabled={loading}
          className={`group p-2 rounded-lg transition-all duration-200 ${
            isFavorited
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-red-400'
          } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart 
            className={`h-4 w-4 transition-transform group-hover:scale-110 ${
              isFavorited ? 'fill-current' : ''
            }`} 
          />
        </button>

        {/* More Actions Button */}
        <button
          onClick={() => setShowActionsMenu(!showActionsMenu)}
          className="group p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-all duration-200"
          title="More actions"
        >
          <MoreHorizontal className="h-4 w-4 transition-transform group-hover:scale-110" />
        </button>
      </div>

      {/* Actions Menu */}
      {showActionsMenu && (
        <div className="absolute right-0 top-12 z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl min-w-48 py-2">
          <button
            onClick={() => setShowCollectionMenu(!showCollectionMenu)}
            className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add to Collection</span>
          </button>
          
          {/* Quick Collection Actions */}
          {showCollectionMenu && (
            <div className="border-t border-gray-700 mt-2 pt-2">
              <div className="px-4 py-1 text-xs text-gray-500 uppercase font-medium">
                Collections ({collections.length})
              </div>
              
              {collections.slice(0, 5).map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => addToCollection(collection.id)}
                  disabled={loading}
                  className="w-full px-6 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-50"
                >
                  <div className="flex justify-between items-center">
                    <span className="truncate">{collection.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {collection._count.cards}
                    </span>
                  </div>
                </button>
              ))}
              
              {collections.length > 5 && (
                <div className="px-6 py-1 text-xs text-gray-500">
                  +{collections.length - 5} more...
                </div>
              )}
              
              <button
                onClick={createNewCollection}
                disabled={loading}
                className="w-full px-6 py-2 text-left text-sm text-blue-400 hover:bg-gray-800 hover:text-blue-300 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <FolderPlus className="h-4 w-4" />
                <span>Create New Collection</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Click Outside Handler */}
      {(showActionsMenu || showCollectionMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowActionsMenu(false);
            setShowCollectionMenu(false);
          }}
        />
      )}
    </div>
  );
}; 