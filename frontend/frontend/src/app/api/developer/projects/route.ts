import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'https://pv3-backend-api-production.up.railway.app';

// GET - Get developer projects
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    // Check if authorization header is present
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Forward the request to the backend API
    const response = await fetch(`${BACKEND_URL}/api/v1/developer/projects`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Developer projects proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch developer projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    // Check if authorization header is present
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Extract only the required fields for the backend
    const backendPayload = {
      name: body.name,
      description: body.description,
      gameType: body.gameType,
      repositoryUrl: body.repositoryUrl,
      demoUrl: body.demoUrl,
      documentation: body.documentation,
      contactEmail: body.contactEmail
    };

    // Forward the request to the backend API
    const response = await fetch(`${BACKEND_URL}/api/v1/developer/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(backendPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Project submission proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to submit project' },
      { status: 500 }
    );
  }
} 