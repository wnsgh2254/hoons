import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { handleApiError } from '@/lib/api-utils';

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
      return handleApiError(error, 'inventory-suppliers GET', '매입처 목록을 불러오지 못했습니다.');
    }

    return NextResponse.json({ suppliers: data ?? [] }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'inventory-suppliers GET', '매입처 목록을 불러오지 못했습니다.');
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
      return handleApiError(error, 'inventory-suppliers POST', '매입처를 저장하지 못했습니다.');
    }

    return NextResponse.json({ supplier: data }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'inventory-suppliers POST', '매입처를 저장하지 못했습니다.');
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
      return handleApiError(error, 'inventory-suppliers PATCH', '매입처를 수정하지 못했습니다.');
    }

    return NextResponse.json({ supplier: data }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'inventory-suppliers PATCH', '매입처를 수정하지 못했습니다.');
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
      return handleApiError(error, 'inventory-suppliers DELETE', '매입처를 삭제하지 못했습니다.');
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'inventory-suppliers DELETE', '매입처를 삭제하지 못했습니다.');
  }
}

