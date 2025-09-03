import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  async createTicket(userId: string, data: {
    subject: string;
    category: string;
    priority: string;
    message: string;
    attachments?: any[];
  }) {
    try {
      const ticket = await this.prisma.supportTicket.create({
        data: {
          userId,
          title: data.subject,
          description: data.message,
          category: data.category as any,
          priority: data.priority as any,
          status: 'OPEN',
        },
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          messages: true,
        },
      });

      // Create initial message
      await this.prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          content: data.message,
          senderType: 'USER',
        },
      });

      return ticket;
    } catch (error) {
      throw new BadRequestException('Failed to create support ticket');
    }
  }

  async getTickets(userId: string, isStaff: boolean = false) {
    const where = isStaff ? {} : { userId };
    
    return this.prisma.supportTicket.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            messages: true,
            attachments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTicketById(ticketId: string, userId: string, isStaff: boolean = false) {
    const where = isStaff 
      ? { id: ticketId }
      : { id: ticketId, userId };

    const ticket = await this.prisma.supportTicket.findUnique({
      where,
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        messages: {
          include: {
            attachments: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        attachments: true,
      },
    });

    if (!ticket) {
      throw new BadRequestException('Ticket not found');
    }

    return ticket;
  }

  async addMessage(ticketId: string, userId: string, message: string, isStaff: boolean = false) {
    // Verify ticket exists and user has access
    const ticket = await this.getTicketById(ticketId, userId, isStaff);

    const newMessage = await this.prisma.supportMessage.create({
      data: {
        ticketId,
        content: message,
        senderType: isStaff ? 'AGENT' : 'USER',
      },
    });

    // Update ticket status if needed
    if (isStaff && ticket.status === 'OPEN') {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { 
          status: 'IN_PROGRESS',
        },
      });
    }

    return newMessage;
  }

  async updateTicketStatus(ticketId: string, status: string, userId: string, isStaff: boolean = false) {
    const where = isStaff 
      ? { id: ticketId }
      : { id: ticketId, userId };

    return this.prisma.supportTicket.update({
      where,
      data: { 
        status: status as any,
        ...(status === 'RESOLVED' && { resolvedAt: new Date() }),
      },
    });
  }
}