import { NextRequest, NextResponse } from 'next/server';
import { getServicesByShop } from '@/lib/data';
import { supabase } from '@/lib/supabase';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, price, duration_minutes, shop_id, is_active, category, visible_to, description } =
      body;

    if (!name || price === undefined || !duration_minutes) {
      return NextResponse.json(
        { error: 'Name, price, and duration_minutes are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('services')
      .insert({
        name,
        price,
        duration_minutes,
        description:
          typeof description === 'string' && description.trim() ? description.trim() : null,
        shop_id: shop_id || null,
        is_active: is_active !== undefined ? is_active : true,
        category: category || null,
        visible_to: visible_to || 'customer',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating service:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ service: data }, { status: 201 });
  } catch (error) {
    console.error('Error in services POST route:', error);
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 });
  }
}


