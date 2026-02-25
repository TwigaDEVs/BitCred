import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  return handleProxy(request, params.path || []);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  return handleProxy(request, params.path || []);
}

async function handleProxy(request: NextRequest, path: string[]) {
  try {
    const backendUrl = `https://bitcred-production.up.railway.app/${path.join('/')}`;
    console.log('Proxying to:', backendUrl); 
    
    const response = await fetch(backendUrl, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from backend' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}