import { NextRequest, NextResponse } from 'next/server';
import { getDesignersByShop } from '@/lib/data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopIdParam = searchParams.get('shopId');

    if (!shopIdParam) {
      return NextResponse.json({ error: 'shopId 는 필수입니다.' }, { status: 400 });
    }

    const shopId = Number(shopIdParam);
    if (Number.isNaN(shopId)) {
      return NextResponse.json({ error: 'shopId 가 올바르지 않습니다.' }, { status: 400 });
    }

    const designers = await getDesignersByShop(shopId);
    return NextResponse.json({ designers }, { status: 200 });
  } catch (error) {
    console.error('Error in designers GET route:', error);
    return NextResponse.json({ error: '디자이너 목록을 불러오지 못했습니다.' }, { status: 500 });
  }
}


