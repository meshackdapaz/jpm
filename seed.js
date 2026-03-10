const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
const result = dotenv.config({ path: '.env.local' });
if (result.error) {
  console.error('Error loading .env.local:', result.error);
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Required Supabase environment variables are missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const dummyUsers = [
  {
    email: 'elon@example.com',
    password: 'password123',
    full_name: 'Elon Musk',
    username: 'elonmusk',
    avatar: 'https://i.imgur.com/B1p6VvY.jpg'
  },
  {
    email: 'techmeme@example.com',
    password: 'password123',
    full_name: 'Tech Meme Guy',
    username: 'techmemes',
    avatar: 'https://i.imgur.com/8QjB4P2.png'
  },
  {
    email: 'doge@example.com',
    password: 'password123',
    full_name: 'Doge Official',
    username: 'dogecoin',
    avatar: 'https://pbs.twimg.com/profile_images/1642953331698282498/LIfaFMBw_400x400.jpg'
  }
];

async function seed() {
  for (const user of dummyUsers) {
    console.log(`Creating user: ${user.email} (${user.username})...`);
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
      options: {
        data: {
          full_name: user.full_name,
          username: user.username
        }
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(`User ${user.email} already exists.`);
        continue;
      }
      console.log('Error signing up', user.email, authError.message);
      continue;
    }

    if (authData.user) {
      console.log(`User created. Updating profile ${authData.user.id}...`);
      const { error: profileError } = await supabase.from('profiles').update({
        avatar_url: user.avatar,
        is_verified: true
      }).eq('id', authData.user.id);
      
      if (profileError) {
        console.log('Error updating profile', profileError.message);
      } else {
        console.log('Successfully created and updated user:', user.email);
      }
    }
  }
}

seed().catch(err => {
  console.error('Unhandled error in seed script:', err);
});
