import { NextRequest, NextResponse } from 'next/server';

// Partner application API route
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const walletAddress = authHeader.replace('Bearer ', '');
    
    // Validate required fields
    const { name, email, applicationReason, contentStrategy } = body;

    if (!name || !email || !applicationReason || !contentStrategy) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // For now, just return success - database integration can be added later
    return NextResponse.json({ 
      message: 'Application submitted successfully',
      application: {
        id: 'temp-id',
        status: 'pending',
        submittedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error submitting partner application:', error);
    return NextResponse.json({ 
      error: 'Failed to submit application' 
    }, { status: 500 });
  }
} 