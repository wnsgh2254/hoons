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

async function seedCustomers() {
  try {
    // Comment: Get customers data from command line arguments or stdin
    const customersData = [];
    
    // Comment: Read from command line arguments (format: name:phone,name:phone,...)
    if (process.argv.length > 2) {
      const input = process.argv.slice(2).join(' ');
      const pairs = input.split(',').map(pair => pair.trim());
      
      pairs.forEach(pair => {
        const [name, phone] = pair.split(':').map(s => s.trim());
        if (name && phone) {
          customersData.push({ name, phone });
        }
      });
    }

    if (customersData.length === 0) {
      console.error('No customers provided. Usage: node seed-customers.js "name1:phone1,name2:phone2,..."');
      process.exit(1);
    }

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

    const customersToInsert = customersData.map((customer, index) => ({
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
