// Debug script to check why designers don't appear on 2026-01-18 (Sunday)
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSundayIssue() {
  const testDate = '2026-01-18';
  console.log(`Debugging why designers don't appear on ${testDate} (Sunday)\n`);
  console.log('='.repeat(60));

  // 1. Check weekday calculation
  const weekday = new Date(testDate + 'T12:00:00Z').getUTCDay();
  console.log(`1. Weekday calculation: ${weekday} (0=Sunday)\n`);

  // 2. Check Sunday schedules
  const { data: scheduleData, error: scheduleError } = await supabase
    .from('designer_schedules')
    .select('designer_id, weekday, effective_from, effective_to')
    .eq('weekday', 0)
    .lte('effective_from', testDate)
    .or(`effective_to.is.null,effective_to.gte.${testDate}`);

  if (scheduleError) {
    console.error('Error fetching schedules:', scheduleError);
    return;
  }

  console.log('2. Sunday schedules found:');
  console.log(JSON.stringify(scheduleData, null, 2));
  
  const designerIdsFromSchedule = Array.from(
    new Set((scheduleData || []).map((row) => row.designer_id).filter(Boolean))
  );
  console.log(`   Designer IDs from schedule: ${JSON.stringify(designerIdsFromSchedule)}\n`);

  // 3. Check special work days
  const { data: timeOffData, error: timeOffError } = await supabase
    .from('designer_time_off')
    .select('designer_id, shop_id, start_date, end_date')
    .eq('reason', '특별 근무일')
    .lte('start_date', testDate)
    .gte('end_date', testDate);

  if (timeOffError) {
    console.error('Error fetching special work days:', timeOffError);
  } else {
    console.log('3. Special work days found:');
    console.log(JSON.stringify(timeOffData, null, 2));
    
    const designerIdsFromSpecialWork = Array.from(
      new Set((timeOffData || []).map((row) => row.designer_id).filter(Boolean))
    );
    console.log(`   Designer IDs from special work: ${JSON.stringify(designerIdsFromSpecialWork)}\n`);
  }

  // 4. Combined result
  const allDesignerIds = Array.from(
    new Set([...designerIdsFromSchedule, ...((timeOffData || []).map((row) => row.designer_id).filter(Boolean))])
  );
  console.log(`4. Combined designer IDs: ${JSON.stringify(allDesignerIds)}\n`);

  // 5. Check if 준호 (ID: 33) is in allDesigners
  const { data: allDesigners, error: designersError } = await supabase
    .from('designers')
    .select('id, name');

  if (designersError) {
    console.error('Error fetching all designers:', designersError);
    return;
  }

  console.log('5. All designers in database:');
  allDesigners.forEach(d => {
    console.log(`   - ${d.name} (ID: ${d.id})`);
  });
  console.log();

  const junho = allDesigners.find(d => d.id === 33);
  if (junho) {
    console.log(`6. 준호 found in allDesigners: ${junho.name} (ID: ${junho.id})`);
    if (allDesignerIds.includes(33)) {
      console.log('   ✓ 준호 is in availableDesignerIds');
      console.log('   ✓ 준호 should appear in visibleDesigners');
    } else {
      console.log('   ✗ 준호 is NOT in availableDesignerIds');
      console.log('   ✗ 준호 will NOT appear in visibleDesigners');
    }
  } else {
    console.log('6. ✗ 준호 (ID: 33) NOT found in allDesigners');
  }

  console.log('\n' + '='.repeat(60));
  console.log('Conclusion:');
  if (allDesignerIds.length === 0) {
    console.log('⚠️  availableDesignerIds is empty - no designers will be shown');
    console.log('   This is why the column is empty!');
  } else if (!allDesignerIds.includes(33)) {
    console.log('⚠️  준호 (ID: 33) is not in availableDesignerIds');
    console.log('   Check why 준호\'s schedule is not being returned');
  } else if (!allDesigners.find(d => d.id === 33)) {
    console.log('⚠️  준호 (ID: 33) is not in allDesigners');
    console.log('   Check if 준호 exists in designers table');
  } else {
    console.log('✓ 준호 should appear - check frontend logic');
  }
}

debugSundayIssue()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
