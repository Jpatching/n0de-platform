import {
  Controller,
  Post,
  Delete,
  UseInterceptors,
  UploadedFile,
  Headers,
  Req,
  Res,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { UploadService } from './upload.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

@Controller('uploads')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(private uploadService: UploadService) {}

  /**
   * Upload avatar image
   * POST /uploads/avatar
   */
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: os.tmpdir(), // Use system temp directory
        filename: (req, file, callback) => {
          // Generate unique filename with timestamp
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const ext = extname(file.originalname);
          const filename = `avatar-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      fileFilter: (req, file, callback) => {
        // Only allow image files
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return callback(new Error('Only image files are allowed!'), false);
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  )
  async uploadAvatar(
    @UploadedFile() file: any,
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      // Extract token from authorization header or cookies
      const token = this.extractToken(authorization, req);
      
      const result = await this.uploadService.uploadAvatar(token, file);

      this.logger.log(`Avatar uploaded successfully for user`);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Avatar uploaded successfully',
        avatarUrl: result.avatarUrl,
        user: result.user,
      });
    } catch (error) {
      this.logger.error(`Avatar upload failed: ${error.message}`);
      
      // Clean up uploaded file if there was an error
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(`Avatar upload failed: ${error.message}`);
    }
  }

  /**
   * Delete avatar image
   * DELETE /uploads/avatar
   */
  @Delete('avatar')
  async deleteAvatar(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Extract token from authorization header or cookies
      const token = this.extractToken(authorization, req);
      
      const result = await this.uploadService.deleteAvatar(token);

      this.logger.log(`Avatar deleted successfully`);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Avatar deleted successfully',
        user: result.user,
      });
    } catch (error) {
      this.logger.error(`Avatar deletion failed: ${error.message}`);
      throw new BadRequestException(`Avatar deletion failed: ${error.message}`);
    }
  }

  /**
   * Extract token from authorization header or cookies
   */
  private extractToken(authorization: string, req: Request): string {
    if (authorization && authorization.startsWith('Bearer ')) {
      return authorization.substring(7);
    }
    
    if (req.cookies && req.cookies.pv3_token) {
      return req.cookies.pv3_token;
    }
    
    throw new BadRequestException('No authentication token provided');
  }
} 