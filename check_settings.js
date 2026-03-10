const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8').split('\n');
let url = '', key = '';
env.forEach(line => {
  if(line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if(line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function run() {
  // We can't run DDL easily via REST API without a function. 
  // Let's check if the column exists by selecting it.
  const { data, error } = await supabase.from('profiles').select('settings').limit(1);
  if (error) {
    console.error("Column likely missing:", error.message);
  } else {
    console.log("Settings column exists.");
  }
}
run();
