import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  console.log('=== PROXY DEBUG ===');
  console.log('Full URL:', request.url);
  console.log('Path params:', params.path);
  
  try {
    const pathString = params.path ? params.path.join('/') : '';
    const backendUrl = `https://bitcred-production.up.railway.app/${pathString}`;
    console.log('Fetching from backend:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Backend response status:', response.status);
    
    const data = await response.json();
    console.log('Backend data:', data);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy failed', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  // Similar to GET but with body handling
  try {
    const body = await request.json();
    const pathString = params.path ? params.path.join('/') : '';
    const backendUrl = `https://bitcred-production.up.railway.app/${pathString}`;
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}