import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const backendUrl = `https://bitcred-production.up.railway.app/${params.path.join('/')}`;
  console.log('Proxying to:', backendUrl);
  
  const response = await fetch(backendUrl);
  const data = await response.json();
  
  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const backendUrl = `https://bitcred-production.up.railway.app/${params.path.join('/')}`;
  const body = await request.json();
  
  const response = await fetch(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  const data = await response.json();
  return NextResponse.json(data);
}