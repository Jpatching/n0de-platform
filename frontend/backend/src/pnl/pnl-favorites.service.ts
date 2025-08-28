import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PnLFavoritesService {
  constructor(private prisma: PrismaService) {}

  // Favorites Management
  async addToFavorites(userId: string, cardId: string) {
    try {
      // Check if card exists and belongs to user
      const card = await this.prisma.pnLRecord.findFirst({
        where: { id: cardId, userId }
      });

      if (!card) {
        throw new NotFoundException('PnL card not found');
      }

      // Check if already favorited
      const existingFavorite = await this.prisma.pnLCardFavorite.findUnique({
        where: { userId_cardId: { userId, cardId } }
      });

      if (existingFavorite) {
        throw new BadRequestException('Card already in favorites');
      }

      return await this.prisma.pnLCardFavorite.create({
        data: { userId, cardId },
        include: {
          card: {
            include: {
              user: true
            }
          }
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async removeFromFavorites(userId: string, cardId: string) {
    try {
      const favorite = await this.prisma.pnLCardFavorite.findUnique({
        where: { userId_cardId: { userId, cardId } }
      });

      if (!favorite) {
        throw new NotFoundException('Favorite not found');
      }

      return await this.prisma.pnLCardFavorite.delete({
        where: { userId_cardId: { userId, cardId } }
      });
    } catch (error) {
      throw error;
    }
  }

  async getFavorites(userId: string, page = 1, limit = 12) {
    const offset = (page - 1) * limit;

    return await this.prisma.pnLCardFavorite.findMany({
      where: { userId },
      include: {
        card: {
          include: {
            user: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    });
  }

  async isFavorited(userId: string, cardId: string): Promise<boolean> {
    const favorite = await this.prisma.pnLCardFavorite.findUnique({
      where: { userId_cardId: { userId, cardId } }
    });
    return !!favorite;
  }

  // Collections Management
  async createCollection(userId: string, name: string, description?: string, isPublic = false) {
    try {
      return await this.prisma.pnLCollection.create({
        data: {
          userId,
          name,
          description,
          isPublic
        },
        include: {
          _count: {
            select: { cards: true }
          }
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async getCollections(userId: string) {
    return await this.prisma.pnLCollection.findMany({
      where: { userId },
      include: {
        _count: {
          select: { cards: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async getCollection(userId: string, collectionId: string) {
    const collection = await this.prisma.pnLCollection.findFirst({
      where: { id: collectionId, userId },
      include: {
        cards: {
          include: {
            card: {
              include: {
                user: true
              }
            }
          },
          orderBy: { addedAt: 'desc' }
        },
        _count: {
          select: { cards: true }
        }
      }
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    return collection;
  }

  async addCardToCollection(userId: string, collectionId: string, cardId: string) {
    try {
      // Verify collection belongs to user
      const collection = await this.prisma.pnLCollection.findFirst({
        where: { id: collectionId, userId }
      });

      if (!collection) {
        throw new NotFoundException('Collection not found');
      }

      // Verify card belongs to user
      const card = await this.prisma.pnLRecord.findFirst({
        where: { id: cardId, userId }
      });

      if (!card) {
        throw new NotFoundException('PnL card not found');
      }

      // Check if already in collection
      const existingCard = await this.prisma.pnLCollectionCard.findUnique({
        where: { collectionId_cardId: { collectionId, cardId } }
      });

      if (existingCard) {
        throw new BadRequestException('Card already in collection');
      }

      return await this.prisma.pnLCollectionCard.create({
        data: { collectionId, cardId },
        include: {
          card: {
            include: {
              user: true
            }
          }
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async removeCardFromCollection(userId: string, collectionId: string, cardId: string) {
    try {
      // Verify collection belongs to user
      const collection = await this.prisma.pnLCollection.findFirst({
        where: { id: collectionId, userId }
      });

      if (!collection) {
        throw new NotFoundException('Collection not found');
      }

      const collectionCard = await this.prisma.pnLCollectionCard.findUnique({
        where: { collectionId_cardId: { collectionId, cardId } }
      });

      if (!collectionCard) {
        throw new NotFoundException('Card not found in collection');
      }

      return await this.prisma.pnLCollectionCard.delete({
        where: { collectionId_cardId: { collectionId, cardId } }
      });
    } catch (error) {
      throw error;
    }
  }

  async updateCollection(userId: string, collectionId: string, data: { name?: string; description?: string; isPublic?: boolean }) {
    try {
      const collection = await this.prisma.pnLCollection.findFirst({
        where: { id: collectionId, userId }
      });

      if (!collection) {
        throw new NotFoundException('Collection not found');
      }

      return await this.prisma.pnLCollection.update({
        where: { id: collectionId },
        data,
        include: {
          _count: {
            select: { cards: true }
          }
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async deleteCollection(userId: string, collectionId: string) {
    try {
      const collection = await this.prisma.pnLCollection.findFirst({
        where: { id: collectionId, userId }
      });

      if (!collection) {
        throw new NotFoundException('Collection not found');
      }

      // Delete all cards in collection first
      await this.prisma.pnLCollectionCard.deleteMany({
        where: { collectionId }
      });

      // Delete the collection
      return await this.prisma.pnLCollection.delete({
        where: { id: collectionId }
      });
    } catch (error) {
      throw error;
    }
  }

  // Cleanup System - Runs daily at 2 AM
  @Cron('0 2 * * *')
  async cleanupOldCards() {
    try {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      // Find cards older than 15 days that are NOT favorited AND NOT in any collection
      const cardsToDelete = await this.prisma.pnLRecord.findMany({
        where: {
          createdAt: { lt: fifteenDaysAgo },
          AND: [
            {
              favorites: {
                none: {}
              }
            },
            {
              collectionCards: {
                none: {}
              }
            }
          ]
        },
        select: { id: true }
      });

      if (cardsToDelete.length > 0) {
        const cardIds = cardsToDelete.map(card => card.id);
        
        // Delete the old unfavorited cards
        const deletedCount = await this.prisma.pnLRecord.deleteMany({
          where: {
            id: { in: cardIds }
          }
        });

        console.log(`🧹 PnL Cleanup: Deleted ${deletedCount.count} old PnL cards (older than 15 days, not favorited, not in collections)`);
        
        return deletedCount.count;
      }

      console.log('🧹 PnL Cleanup: No old cards to delete');
      return 0;
    } catch (error) {
      console.error('❌ PnL Cleanup Error:', error);
      throw error;
    }
  }

  // Manual cleanup method for admin/testing
  async manualCleanup() {
    return await this.cleanupOldCards();
  }

  // Get cleanup stats
  async getCleanupStats() {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const [totalCards, oldCards, oldFavoritedCards, oldCollectionCards] = await Promise.all([
      this.prisma.pnLRecord.count(),
      this.prisma.pnLRecord.count({
        where: { createdAt: { lt: fifteenDaysAgo } }
      }),
      this.prisma.pnLRecord.count({
        where: {
          createdAt: { lt: fifteenDaysAgo },
          favorites: { some: {} }
        }
      }),
      this.prisma.pnLRecord.count({
        where: {
          createdAt: { lt: fifteenDaysAgo },
          collectionCards: { some: {} }
        }
      })
    ]);

    const oldUnprotectedCards = await this.prisma.pnLRecord.count({
      where: {
        createdAt: { lt: fifteenDaysAgo },
        AND: [
          { favorites: { none: {} } },
          { collectionCards: { none: {} } }
        ]
      }
    });

    return {
      totalCards,
      oldCards,
      oldFavoritedCards,
      oldCollectionCards,
      oldUnprotectedCards, // These will be deleted on next cleanup
      nextCleanupDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow at 2 AM
    };
  }
} 