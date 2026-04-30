const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
)

async function check() {
  const { data, error } = await supabase.from('stories').select('id').limit(1)
  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
  console.log('Success: stories table exists!')
  
  const { data: bData, error: bError } = await supabase.from('bookmarks').select('id').limit(1)
  if (bError) {
    console.error('Error bookmarks:', bError.message)
    process.exit(1)
  }
  console.log('Success: bookmarks table exists!')
}

check()
