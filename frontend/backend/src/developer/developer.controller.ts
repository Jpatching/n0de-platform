import { Controller, Get, Post, Put, Body, Headers, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { DeveloperService } from './developer.service';
import { AuthService } from '../auth/auth.service';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

class RegisterDeveloperDto {
  @IsString()
  @IsNotEmpty()
  walletAddress: string;
}

class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  gameType: string;

  @IsOptional()
  @IsString()
  repositoryUrl?: string;

  @IsOptional()
  @IsString()
  demoUrl?: string;

  @IsOptional()
  @IsString()
  documentation?: string;

  @IsString()
  @IsNotEmpty()
  contactEmail: string;
}

@Controller('developer')
export class DeveloperController {
  constructor(
    private readonly developerService: DeveloperService,
    private readonly authService: AuthService,
  ) {}

  private async validateSession(auth: string) {
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization header');
    }

    const token = auth.substring(7);
    const session = await this.authService.validateToken(token);
    
    if (!session) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return session;
  }

  @Post('register')
  async registerDeveloper(
    @Headers('authorization') auth: string,
    @Body() registerDto: RegisterDeveloperDto
  ) {
    const session = await this.validateSession(auth);
    
    // Ensure the wallet address matches the authenticated user
    if (session.wallet !== registerDto.walletAddress) {
      throw new BadRequestException('Wallet address mismatch');
    }

    const developer = await this.developerService.registerDeveloper(registerDto.walletAddress);
    return { success: true, developer };
  }

  @Get('profile')
  async getDeveloperProfile(@Headers('authorization') auth: string) {
    const session = await this.validateSession(auth);
    const developer = await this.developerService.getDeveloperProfile(session.wallet);
    return { developer };
  }

  @Get('projects')
  async getDeveloperProjects(@Headers('authorization') auth: string) {
    const session = await this.validateSession(auth);
    const projects = await this.developerService.getDeveloperProjects(session.wallet);
    return { projects };
  }

  @Post('projects')
  async createProject(
    @Headers('authorization') auth: string,
    @Body() createProjectDto: CreateProjectDto
  ) {
    const session = await this.validateSession(auth);
    const project = await this.developerService.createProject(session.wallet, createProjectDto);
    return { success: true, project };
  }

  @Get('stats')
  async getDeveloperStats(@Headers('authorization') auth: string) {
    const session = await this.validateSession(auth);
    const stats = await this.developerService.getDeveloperStats(session.wallet);
    return { stats };
  }
} 