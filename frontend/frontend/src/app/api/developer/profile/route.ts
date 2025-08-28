import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'https://pv3-backend-api-production.up.railway.app';

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

    // Forward the request to the backend API with proper headers
    const response = await fetch(`${BACKEND_URL}/api/v1/developer/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader, // Forward the auth header
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // Also get projects and stats
    const [projectsResponse, statsResponse] = await Promise.all([
      fetch(`${BACKEND_URL}/api/v1/developer/projects`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        }
      }),
      fetch(`${BACKEND_URL}/api/v1/developer/stats`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        }
      })
    ]);

    const projects = projectsResponse.ok ? (await projectsResponse.json()).projects : [];
    const stats = statsResponse.ok ? (await statsResponse.json()).stats : {
      totalRevenue: 0,
      totalPlayers: 0,
      totalMatches: 0,
      activeProjects: 0,
      pendingProjects: 0,
      approvedProjects: 0
    };

    return NextResponse.json({
      ...data,
      projects,
      stats
    });

  } catch (error) {
    console.error('Developer profile proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch developer profile' },
      { status: 500 }
    );
  }
} 