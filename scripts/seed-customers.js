// Comment: Script to seed example customer data
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

async function seedCustomers() {
  try {
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

    const { data: insertedCustomers, error } = await supabase
      .from('customers')
      .insert(customersToInsert)
      .select();

    if (error) {
      console.error('Error inserting customers:', error);
      process.exit(1);
    }

    console.log(`✅ Successfully created ${insertedCustomers?.length || 0} customers`);
    console.log('Created customers:');
    insertedCustomers?.forEach((c) => {
      console.log(`  - ${c.name} (${c.phone}) - Customer #${c.customer_number}`);
    });
  } catch (error) {
    console.error('Error seeding customers:', error);
    process.exit(1);
  }
}

seedCustomers();
