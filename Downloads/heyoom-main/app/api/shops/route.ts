import { NextRequest, NextResponse } from 'next/server';
import { getShops } from '@/lib/data';

export async function GET(_request: NextRequest) {
  try {
    const shops = await getShops();
    return NextResponse.json({ shops }, { status: 200 });
  } catch (error) {
    console.error('Error in shops GET route:', error);
    return NextResponse.json({ error: '샵 목록을 불러오지 못했습니다.' }, { status: 500 });
  }
}


