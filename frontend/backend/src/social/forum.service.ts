import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface CreateThreadDto {
  title: string;
  content: string;
  categoryId: string;
}

export interface CreatePostDto {
  content: string;
  threadId: string;
}

export interface UpdateThreadDto {
  title?: string;
  content?: string;
  isPinned?: boolean;
  isLocked?: boolean;
}

@Injectable()
export class ForumService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async getCategories() {
    return this.prisma.forumCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        threads: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async getCategoryBySlug(slug: string) {
    const category = await this.prisma.forumCategory.findUnique({
      where: { slug, isActive: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async getThreadsByCategory(
    categoryId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const [threads, total] = await Promise.all([
      this.prisma.forumThread.findMany({
        where: { categoryId },
        include: {
          author: {
            select: { id: true, username: true, displayName: true, avatar: true },
          },
          category: true,
          lastPostAuthor: {
            select: { id: true, username: true, displayName: true, avatar: true },
          },
        },
        orderBy: [
          { isPinned: 'desc' },
          { lastPostAt: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.forumThread.count({
        where: { categoryId },
      }),
    ]);

    return {
      threads,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async getThread(threadId: string) {
    const thread = await this.prisma.forumThread.findUnique({
      where: { id: threadId },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
        category: true,
      },
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    // Increment view count
    await this.prisma.forumThread.update({
      where: { id: threadId },
      data: { viewCount: thread.viewCount + 1 },
    });

    return thread;
  }

  async getPostsByThread(
    threadId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.forumPost.findMany({
        where: { threadId },
        include: {
          author: {
            select: { id: true, username: true, displayName: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.forumPost.count({
        where: { threadId },
      }),
    ]);

    return {
      posts,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async createThread(userId: string, createThreadDto: CreateThreadDto) {
    const { title, content, categoryId } = createThreadDto;

    // Verify category exists
    const category = await this.prisma.forumCategory.findUnique({
      where: { id: categoryId, isActive: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.prisma.forumThread.create({
      data: {
        title,
        content,
        categoryId,
        authorId: userId,
        lastPostAt: new Date(),
        lastPostAuthorId: userId,
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
        category: true,
      },
    });
  }

  async createPost(userId: string, createPostDto: CreatePostDto) {
    const { content, threadId } = createPostDto;

    // Verify thread exists and is not locked
    const thread = await this.prisma.forumThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    if (thread.isLocked) {
      throw new ForbiddenException('Thread is locked');
    }

    const post = await this.prisma.forumPost.create({
      data: {
        content,
        threadId,
        authorId: userId,
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
      },
    });

    // Update thread stats
    await this.prisma.forumThread.update({
      where: { id: threadId },
      data: {
        replyCount: thread.replyCount + 1,
        lastPostAt: new Date(),
        lastPostAuthorId: userId,
      },
    });

    return post;
  }

  async updateThread(threadId: string, userId: string, updateThreadDto: UpdateThreadDto) {
    const thread = await this.prisma.forumThread.findUnique({
      where: { id: threadId },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
      },
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    // Only author can update thread content
    if (thread.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own threads');
    }

    return this.prisma.forumThread.update({
      where: { id: threadId },
      data: updateThreadDto,
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
        category: true,
      },
    });
  }

  async updatePost(postId: string, userId: string, content: string) {
    const post = await this.prisma.forumPost.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    return this.prisma.forumPost.update({
      where: { id: postId },
      data: {
        content,
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
      },
    });
  }

  async deleteThread(threadId: string, userId: string): Promise<void> {
    const thread = await this.prisma.forumThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    if (thread.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own threads');
    }

    // Delete all posts in the thread first, then the thread
    await this.prisma.$transaction([
      this.prisma.forumPost.deleteMany({ where: { threadId } }),
      this.prisma.forumThread.delete({ where: { id: threadId } }),
    ]);
  }

  async deletePost(postId: string, userId: string): Promise<void> {
    const post = await this.prisma.forumPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.prisma.forumPost.delete({ where: { id: postId } });

    // Update thread reply count
    const thread = await this.prisma.forumThread.findUnique({
      where: { id: post.threadId },
    });

    if (thread) {
      await this.prisma.forumThread.update({
        where: { id: post.threadId },
        data: { replyCount: Math.max(0, thread.replyCount - 1) },
      });
    }
  }

  async searchThreads(
    query: string,
    categoryId?: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    
    const whereClause: any = {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    const [threads, total] = await Promise.all([
      this.prisma.forumThread.findMany({
        where: whereClause,
        include: {
          author: {
            select: { id: true, username: true, displayName: true, avatar: true },
          },
          category: true,
        },
        orderBy: [
          { isPinned: 'desc' },
          { lastPostAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.forumThread.count({
        where: whereClause,
      }),
    ]);

    return {
      threads,
      total,
      pages: Math.ceil(total / limit),
    };
  }
} 