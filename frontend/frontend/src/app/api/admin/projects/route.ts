import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Get all projects for admin review
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ message: 'Admin projects API - GET endpoint' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update project status
export async function PUT(request: NextRequest) {
  try {
    return NextResponse.json({ message: 'Admin projects API - PUT endpoint' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add admin comment/note to project
export async function POST(request: NextRequest) {
  try {
    const {
      projectId,
      adminWallet,
      notes,
      isInternal = false
    } = await request.json();

    if (!projectId || !adminWallet || !notes) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify admin access
    const admin = await prisma.admin.findUnique({
      where: { walletAddress: adminWallet }
    });

    if (!admin || !admin.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Create review entry
    const review = await prisma.projectReview.create({
      data: {
        projectId,
        adminId: admin.id,
        action: isInternal ? 'internal_note' : 'comment',
        notes,
        feedback: isInternal ? null : notes
      }
    });

    return NextResponse.json({
      success: true,
      review,
      message: 'Note added successfully'
    });

  } catch (error) {
    console.error('Error adding project note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 