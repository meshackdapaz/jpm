import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_INSFORGE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log(`Connecting to ${supabaseUrl}...`)
  const { data, error } = await supabase.from('direct_ads').select('*').limit(1)
  if (error) {
    console.error('Error connecting to Supabase:', error.message)
  } else {
    console.log('Successfully connected to Supabase! Data:', data)
  }
}

testConnection()
