import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: Create test data for sales page - 2026-01-18
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const seedCustomers = body?.seedCustomers === true;

    // Comment: Seed customers if requested
    if (seedCustomers) {
      const exampleCustomers = [
        { name: 'kb', phone: '0450261216' },
        { name: 'priscilla', phone: '0412345678' },
        { name: '에스더 한', phone: '0423456789' },
        { name: 'Anna Nguyen', phone: '0434567890' },
        { name: 'Sarah Kim', phone: '0445678901' },
        { name: 'James Park', phone: '0456789012' },
        { name: 'Lisa Chen', phone: '0467890123' },
        { name: 'Michael Lee', phone: '0478901234' },
        { name: 'Emma Wilson', phone: '0489012345' },
        { name: 'David Brown', phone: '0490123456' },
        { name: 'Sophie Taylor', phone: '0401234567' },
        { name: 'Ryan Johnson', phone: '0412345679' },
        { name: 'Olivia Martinez', phone: '0423456780' },
      ];

      // Comment: Get the last customer number
      const { data: lastCustomer } = await supabase
        .from('customers')
        .select('customer_number')
        .order('customer_number', { ascending: false })
        .limit(1)
        .single();

      let nextCustomerNumber = 1;
      if (lastCustomer?.customer_number) {
        nextCustomerNumber = Number(lastCustomer.customer_number) + 1;
      }

      const customersToInsert = exampleCustomers.map((customer, index) => ({
        name: customer.name,
        phone: customer.phone.replace(/\D/g, ''),
        customer_number: nextCustomerNumber + index,
        created_at: new Date().toISOString(),
      }));

      const { data: insertedCustomers, error: customersError } = await supabase
        .from('customers')
        .insert(customersToInsert)
        .select();

      if (customersError) {
        console.error('Error inserting customers:', customersError);
        return NextResponse.json(
          { error: '고객 데이터 생성에 실패했습니다.', details: customersError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        customers: insertedCustomers?.length || 0,
        message: `${insertedCustomers?.length || 0}명의 고객이 생성되었습니다.`,
      });
    }
    // Comment: Get designers (태훈, 윤훈)
    const { data: designers, error: designersError } = await supabase
      .from('designers')
      .select('id, name')
      .in('name', ['태훈', '윤훈', '태훈원장', '윤훈원장']);

    if (designersError) {
      console.error('Error fetching designers:', designersError);
      return NextResponse.json(
        { error: '디자이너 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    if (!designers || designers.length === 0) {
      return NextResponse.json(
        { error: '태훈 또는 윤훈 디자이너를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Comment: Find 태훈 and 윤훈
    const taehoon = designers.find((d: any) => d.name.includes('태훈'));
    const yoonhoon = designers.find((d: any) => d.name.includes('윤훈'));

    if (!taehoon || !yoonhoon) {
      return NextResponse.json(
        { error: '태훈 또는 윤훈 디자이너를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Comment: Get services
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, price')
      .limit(10);

    if (servicesError || !services || services.length === 0) {
      return NextResponse.json(
        { error: '서비스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const cutService = services.find((s: any) => s.name.includes('커트') || s.name.includes('Cut')) || services[0];
    const permService = services.find((s: any) => s.name.includes('펌') || s.name.includes('Perm')) || services[1] || services[0];
    const colorService = services.find((s: any) => s.name.includes('컬러') || s.name.includes('Color')) || services[2] || services[0];

    // Comment: Get shops
    const { data: shops, error: shopsError } = await supabase
      .from('shops')
      .select('id')
      .limit(1);

    const shopId = shops && shops.length > 0 ? shops[0].id : null;

    const testDate = '2026-01-18';
    const bookings = [];

    // Comment: 태훈 - 일반 결제 서비스 (현금)
    bookings.push({
      shop_id: shopId,
      designer_id: taehoon.id,
      customer_id: null,
      service_id: cutService.id,
      booking_date: testDate,
      booking_time: '10:00:00',
      status: 'confirmed',
      deposit_amount: 0,
      total_amount: cutService.price,
      custom_service_name: null,
      custom_service_duration: null,
    });

    // Comment: 태훈 - 일반 결제 서비스 (카드)
    bookings.push({
      shop_id: shopId,
      designer_id: taehoon.id,
      customer_id: null,
      service_id: permService.id,
      booking_date: testDate,
      booking_time: '11:00:00',
      status: 'confirmed',
      deposit_amount: 0,
      total_amount: permService.price,
      custom_service_name: null,
      custom_service_duration: null,
    });

    // Comment: 태훈 - 회원권 차감 서비스 (여러 개)
    for (let i = 0; i < 3; i++) {
      bookings.push({
        shop_id: shopId,
        designer_id: taehoon.id,
        customer_id: null,
        service_id: cutService.id,
        booking_date: testDate,
        booking_time: `${12 + i}:00:00`,
        status: 'confirmed',
        deposit_amount: 0,
        total_amount: cutService.price,
        custom_service_name: null,
        custom_service_duration: null,
        prepaid_pass_id: 1, // Comment: Assume prepaid pass ID 1 exists
      });
    }

    // Comment: 윤훈 - 일반 결제 서비스
    bookings.push({
      shop_id: shopId,
      designer_id: yoonhoon.id,
      customer_id: null,
      service_id: colorService.id,
      booking_date: testDate,
      booking_time: '14:00:00',
      status: 'confirmed',
      deposit_amount: 0,
      total_amount: colorService.price,
      custom_service_name: null,
      custom_service_duration: null,
    });

    // Comment: 윤훈 - 회원권 차감 서비스
    bookings.push({
      shop_id: shopId,
      designer_id: yoonhoon.id,
      customer_id: null,
      service_id: permService.id,
      booking_date: testDate,
      booking_time: '15:00:00',
      status: 'confirmed',
      deposit_amount: 0,
      total_amount: permService.price,
      custom_service_name: null,
      custom_service_duration: null,
      prepaid_pass_id: 2, // Comment: Assume prepaid pass ID 2 exists
    });

    // Comment: Insert bookings
    const { data: insertedBookings, error: bookingsError } = await supabase
      .from('bookings')
      .insert(bookings)
      .select();

    if (bookingsError) {
      console.error('Error inserting bookings:', bookingsError);
      // Comment: If prepaid_pass_id column doesn't exist, try without it
      const bookingsWithoutPrepaid = bookings.map((b: any) => {
        const { prepaid_pass_id, ...rest } = b;
        return rest;
      });

      const { data: insertedBookings2, error: bookingsError2 } = await supabase
        .from('bookings')
        .insert(bookingsWithoutPrepaid)
        .select();

      if (bookingsError2) {
        return NextResponse.json(
          { error: '예약 데이터 추가에 실패했습니다: ' + bookingsError2.message },
          { status: 500 }
        );
      }

      // Comment: Create payments for bookings
      const payments = [];
      if (insertedBookings2) {
        // Comment: 태훈 - 현금 결제
        if (insertedBookings2[0]) {
          payments.push({
            booking_id: insertedBookings2[0].id,
            amount: cutService.price,
            method: 'cash',
            type: 'balance',
            created_at: `${testDate}T10:00:00`,
          });
        }

        // Comment: 태훈 - 카드 결제
        if (insertedBookings2[1]) {
          payments.push({
            booking_id: insertedBookings2[1].id,
            amount: permService.price,
            method: 'card',
            type: 'balance',
            created_at: `${testDate}T11:00:00`,
          });
        }

        // Comment: 윤훈 - 현금 결제
        if (insertedBookings2[4]) {
          payments.push({
            booking_id: insertedBookings2[4].id,
            amount: colorService.price,
            method: 'cash',
            type: 'balance',
            created_at: `${testDate}T14:00:00`,
          });
        }
      }

      if (payments.length > 0) {
        const { error: paymentsError } = await supabase
          .from('payments')
          .insert(payments);

        if (paymentsError) {
          console.error('Error inserting payments:', paymentsError);
        }
      }

      return NextResponse.json(
        {
          message: '테스트 데이터가 추가되었습니다.',
          bookings: insertedBookings2?.length || 0,
          payments: payments.length,
          note: '회원권 차감은 prepaid_pass_id 필드가 없어서 별도로 기록되지 않았습니다.',
        },
        { status: 200 }
      );
    }

    // Comment: Create payments for bookings
    const payments = [];
    if (insertedBookings) {
      // Comment: 태훈 - 현금 결제
      if (insertedBookings[0]) {
        payments.push({
          booking_id: insertedBookings[0].id,
          amount: cutService.price,
          method: 'cash',
          type: 'balance',
          created_at: `${testDate}T10:00:00`,
        });
      }

      // Comment: 태훈 - 카드 결제
      if (insertedBookings[1]) {
        payments.push({
          booking_id: insertedBookings[1].id,
          amount: permService.price,
          method: 'card',
          type: 'balance',
          created_at: `${testDate}T11:00:00`,
        });
      }

      // Comment: 윤훈 - 현금 결제
      if (insertedBookings[4]) {
        payments.push({
          booking_id: insertedBookings[4].id,
          amount: colorService.price,
          method: 'cash',
          type: 'balance',
          created_at: `${testDate}T14:00:00`,
        });
      }
    }

    if (payments.length > 0) {
      const { error: paymentsError } = await supabase
        .from('payments')
        .insert(payments);

      if (paymentsError) {
        console.error('Error inserting payments:', paymentsError);
      }
    }

    return NextResponse.json(
      {
        message: '테스트 데이터가 추가되었습니다.',
        bookings: insertedBookings?.length || 0,
        payments: payments.length,
        designers: {
          taehoon: taehoon.name,
          yoonhoon: yoonhoon.name,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in test-data route:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
