const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if(key) acc[key.trim()] = val.join('=').trim().replace(/\"/g, '');
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
  const { data, error } = await supabase.from('reposts').select('created_at, user_id, profiles:user_id(full_name, username), post:posts(*, profiles(*), likes(count), comments(count), reposts(count))').eq('user_id', '4064c568-6223-4c9e-863a-cf9d29211dab');
  console.log('Error:', error);
  console.log('Data:', JSON.stringify(data, null, 2));
})()
