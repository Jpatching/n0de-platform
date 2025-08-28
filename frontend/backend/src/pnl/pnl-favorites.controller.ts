import { Controller, Get, Post, Delete, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PnLFavoritesService } from './pnl-favorites.service';

@Controller('api/pnl/favorites')
@UseGuards(AuthGuard)
export class PnLFavoritesController {
  constructor(private pnlFavoritesService: PnLFavoritesService) {}

  // Favorites Endpoints
  @Post('add/:cardId')
  async addToFavorites(@Request() req, @Param('cardId') cardId: string) {
    return await this.pnlFavoritesService.addToFavorites(req.user.id, cardId);
  }

  @Delete('remove/:cardId')
  async removeFromFavorites(@Request() req, @Param('cardId') cardId: string) {
    return await this.pnlFavoritesService.removeFromFavorites(req.user.id, cardId);
  }

  @Get('list')
  async getFavorites(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 12
  ) {
    return await this.pnlFavoritesService.getFavorites(req.user.id, +page, +limit);
  }

  @Get('check/:cardId')
  async checkFavorite(@Request() req, @Param('cardId') cardId: string) {
    return { isFavorited: await this.pnlFavoritesService.isFavorited(req.user.id, cardId) };
  }

  // Collections Endpoints
  @Post('collections')
  async createCollection(
    @Request() req,
    @Body() body: { name: string; description?: string; isPublic?: boolean }
  ) {
    return await this.pnlFavoritesService.createCollection(
      req.user.id,
      body.name,
      body.description,
      body.isPublic
    );
  }

  @Get('collections')
  async getCollections(@Request() req) {
    return await this.pnlFavoritesService.getCollections(req.user.id);
  }

  @Get('collections/:collectionId')
  async getCollection(@Request() req, @Param('collectionId') collectionId: string) {
    return await this.pnlFavoritesService.getCollection(req.user.id, collectionId);
  }

  @Put('collections/:collectionId')
  async updateCollection(
    @Request() req,
    @Param('collectionId') collectionId: string,
    @Body() body: { name?: string; description?: string; isPublic?: boolean }
  ) {
    return await this.pnlFavoritesService.updateCollection(req.user.id, collectionId, body);
  }

  @Delete('collections/:collectionId')
  async deleteCollection(@Request() req, @Param('collectionId') collectionId: string) {
    return await this.pnlFavoritesService.deleteCollection(req.user.id, collectionId);
  }

  @Post('collections/:collectionId/cards/:cardId')
  async addCardToCollection(
    @Request() req,
    @Param('collectionId') collectionId: string,
    @Param('cardId') cardId: string
  ) {
    return await this.pnlFavoritesService.addCardToCollection(req.user.id, collectionId, cardId);
  }

  @Delete('collections/:collectionId/cards/:cardId')
  async removeCardFromCollection(
    @Request() req,
    @Param('collectionId') collectionId: string,
    @Param('cardId') cardId: string
  ) {
    return await this.pnlFavoritesService.removeCardFromCollection(req.user.id, collectionId, cardId);
  }

  // Admin/Debug Endpoints
  @Get('cleanup/stats')
  async getCleanupStats() {
    return await this.pnlFavoritesService.getCleanupStats();
  }

  @Post('cleanup/manual')
  async manualCleanup() {
    return { deletedCount: await this.pnlFavoritesService.manualCleanup() };
  }
} 