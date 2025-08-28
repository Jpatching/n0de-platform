import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DeveloperService {
  constructor(private readonly prisma: PrismaService) {}

  async registerDeveloper(walletAddress: string) {
    // Check if developer already exists
    const existingDeveloper = await this.prisma.developer.findUnique({
      where: { walletAddress }
    });

    if (existingDeveloper) {
      throw new BadRequestException('Developer already registered');
    }

    // Create new developer
    const developer = await this.prisma.developer.create({
      data: {
        walletAddress,
        registeredAt: new Date(),
        status: 'active',
        totalRevenue: 0,
        totalProjects: 0,
        approvedProjects: 0
      }
    });

    return {
      id: developer.id,
      walletAddress: developer.walletAddress,
      registeredAt: developer.registeredAt,
      status: developer.status
    };
  }

  async getDeveloperProfile(walletAddress: string) {
    const developer = await this.prisma.developer.findUnique({
      where: { walletAddress },
      include: {
        projects: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!developer) {
      throw new NotFoundException('Developer not found');
    }

    return developer;
  }

  async getDeveloperProjects(walletAddress: string) {
    const developer = await this.prisma.developer.findUnique({
      where: { walletAddress }
    });

    if (!developer) {
      throw new NotFoundException('Developer not found');
    }

    const projects = await this.prisma.developerProject.findMany({
      where: { developerId: developer.id },
      orderBy: { createdAt: 'desc' }
    });

    return projects;
  }

  async createProject(walletAddress: string, projectData: any) {
    const developer = await this.prisma.developer.findUnique({
      where: { walletAddress }
    });

    if (!developer) {
      throw new NotFoundException('Developer not found. Please register as a developer first.');
    }

    const project = await this.prisma.developerProject.create({
      data: {
        developerId: developer.id,
        name: projectData.name,
        description: projectData.description,
        gameType: projectData.gameType,
        repositoryUrl: projectData.repositoryUrl,
        demoUrl: projectData.demoUrl,
        documentation: projectData.documentation,
        contactEmail: projectData.contactEmail,
        status: 'submitted',
        submittedAt: new Date()
      }
    });

    // Update developer's total projects count
    await this.prisma.developer.update({
      where: { id: developer.id },
      data: { totalProjects: { increment: 1 } }
    });

    return project;
  }

  async getDeveloperStats(walletAddress: string) {
    const developer = await this.prisma.developer.findUnique({
      where: { walletAddress },
      include: {
        projects: true
      }
    });

    if (!developer) {
      throw new NotFoundException('Developer not found');
    }

    const totalProjects = developer.projects.length;
    const approvedProjects = developer.projects.filter(p => p.status === 'approved' || p.status === 'live').length;
    const pendingProjects = developer.projects.filter(p => p.status === 'submitted' || p.status === 'under_review').length;
    const totalRevenue = developer.projects.reduce((sum, p) => sum + p.revenue, 0);
    const totalPlayers = developer.projects.reduce((sum, p) => sum + p.players, 0);
    const totalMatches = developer.projects.reduce((sum, p) => sum + p.matches, 0);

    return {
      totalRevenue,
      totalPlayers,
      totalMatches,
      activeProjects: approvedProjects,
      pendingProjects,
      approvedProjects,
      totalProjects
    };
  }
} 