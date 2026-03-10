import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // We need service role to insert or auto confirm if needed, but actually we can just use the anon key if we just want to signUp normally.

// Wait, the project doesn't have dotenv loaded by default for standalone scripts unless we use dotenv.
// It's probably easier to just read from .env.local
import * as dotenv from 'dotenv'
import { readFileSync } from 'fs'

const envConfig = dotenv.parse(readFileSync('.env.local'))
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const dummyUsers = [
  {
    email: 'elon@example.com',
    password: 'password123',
    meta: { full_name: 'Elon Musk', username: 'elonmusk' },
    avatar: 'https://i.imgur.com/B1p6VvY.jpg'
  },
  {
    email: 'techmeme@example.com',
    password: 'password123',
    meta: { full_name: 'Tech Meme Guy', username: 'techmemes' },
    avatar: 'https://i.imgur.com/8QjB4P2.png'
  },
  {
    email: 'doge@example.com',
    password: 'password123',
    meta: { full_name: 'Doge Official', username: 'dogecoin' },
    avatar: 'https://pbs.twimg.com/profile_images/1642953331698282498/LIfaFMBw_400x400.jpg'
  }
]

async function seed() {
  for (const user of dummyUsers) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
      options: {
        data: user.meta
      }
    })

    if (authError) {
      console.log('Error signing up', user.email, authError.message)
      continue
    }

    if (authData.user) {
      // update avatar_url and verified directly if needed
      await supabase.from('profiles').update({
        avatar_url: user.avatar,
        is_verified: true
      }).eq('id', authData.user.id)
      console.log('Created user:', user.email)
    }
  }
}

seed().catch(console.error)
