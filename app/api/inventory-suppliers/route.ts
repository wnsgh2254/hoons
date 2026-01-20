import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: Load supplier list for purchases dropdown / supplier management
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const onlyActive = searchParams.get('onlyActive') !== 'false';

    let query = supabase
      .from('inventory_suppliers')
      .select('id, name, contact_name, mobile_phone, phone, fax, email, memo, is_active')
      .order('name', { ascending: true });

    if (onlyActive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching inventory suppliers:', error);
      return NextResponse.json({ suppliers: [] }, { status: 200 });
    }

    return NextResponse.json({ suppliers: data ?? [] }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in inventory-suppliers GET route:', error);
    return NextResponse.json({ suppliers: [] }, { status: 200 });
  }
}

type SupplierBody = {
  id?: number;
  name: string;
  contactName?: string;
  mobilePhone?: string;
  phone?: string;
  fax?: string;
  email?: string;
  memo?: string;
  isActive?: boolean;
};

// Comment: Create supplier
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SupplierBody;
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: '공급 업체 명은 필수입니다.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('inventory_suppliers')
      .insert({
        name: body.name.trim(),
        contact_name: body.contactName ?? null,
        mobile_phone: body.mobilePhone ?? null,
        phone: body.phone ?? null,
        fax: body.fax ?? null,
        email: body.email ?? null,
        memo: body.memo ?? null,
        is_active: body.isActive ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating supplier:', error);
      return NextResponse.json(
        { error: '매입처를 저장하지 못했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ supplier: data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in inventory-suppliers POST route:', error);
    return NextResponse.json(
      { error: '매입처를 저장하지 못했습니다.' },
      { status: 500 }
    );
  }
}

// Comment: Update supplier
export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as SupplierBody;
    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ error: 'id 가 필요합니다.' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.contactName !== undefined) updates.contact_name = body.contactName ?? null;
    if (body.mobilePhone !== undefined) updates.mobile_phone = body.mobilePhone ?? null;
    if (body.phone !== undefined) updates.phone = body.phone ?? null;
    if (body.fax !== undefined) updates.fax = body.fax ?? null;
    if (body.email !== undefined) updates.email = body.email ?? null;
    if (body.memo !== undefined) updates.memo = body.memo ?? null;
    if (body.isActive !== undefined) updates.is_active = body.isActive;

    const { data, error } = await supabase
      .from('inventory_suppliers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating supplier:', error);
      return NextResponse.json(
        { error: '매입처를 수정하지 못했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ supplier: data }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in inventory-suppliers PATCH route:', error);
    return NextResponse.json(
      { error: '매입처를 수정하지 못했습니다.' },
      { status: 500 }
    );
  }
}

// Comment: Delete supplier
export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as SupplierBody;
    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ error: 'id 가 필요합니다.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('inventory_suppliers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting supplier:', error);
      return NextResponse.json(
        { error: '매입처를 삭제하지 못했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in inventory-suppliers DELETE route:', error);
    return NextResponse.json(
      { error: '매입처를 삭제하지 못했습니다.' },
      { status: 500 }
    );
  }
}

