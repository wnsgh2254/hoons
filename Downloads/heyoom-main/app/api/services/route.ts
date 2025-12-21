import { NextRequest, NextResponse } from 'next/server';
import { getServicesByShop } from '@/lib/data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopIdParam = searchParams.get('shopId');

    const shopId = shopIdParam ? Number(shopIdParam) : undefined;
    if (shopIdParam && Number.isNaN(shopId)) {
      return NextResponse.json({ error: 'shopId 가 올바르지 않습니다.' }, { status: 400 });
    }

    const services = await getServicesByShop(shopId);
    return NextResponse.json({ services }, { status: 200 });
  } catch (error) {
    console.error('Error in services GET route:', error);
    return NextResponse.json({ error: '서비스 목록을 불러오지 못했습니다.' }, { status: 500 });
  }
}


