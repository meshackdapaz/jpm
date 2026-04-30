// Run this to apply the migration to Supabase
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabase = createClient(
  'https://tgfuufsgkelgjjktbugg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZnV1ZnNna2VsZ2pqa3RidWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzMzExNjksImV4cCI6MjA1MTkwNzE2OX0.QqJfJxaOiXgpafNSBe5vSgjJBbEHOmjNIxBHgYqFQNo'
)

// Split into individual statements and run them
const statements = [
  // Stories table
  `CREATE TABLE IF NOT EXISTS stories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    image_url text,
    video_url text,
    text_content text,
    bg_color text DEFAULT '#000000',
    expires_at timestamptz DEFAULT (now() + interval '24 hours'),
    created_at timestamptz DEFAULT now(),
    view_count int DEFAULT 0
  )`,
  
  // Story views table  
  `CREATE TABLE IF NOT EXISTS story_views (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id uuid REFERENCES stories(id) ON DELETE CASCADE,
    viewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    viewed_at timestamptz DEFAULT now(),
    UNIQUE(story_id, viewer_id)
  )`,
  
  // Bookmarks table
  `CREATE TABLE IF NOT EXISTS bookmarks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, post_id)
  )`,

  // Withdrawal requests table
  `CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    amount numeric(10,2) NOT NULL,
    payment_method text DEFAULT 'mpesa',
    phone_number text,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
  )`,
]

async function run() {
  for (const sql of statements) {
    const { error } = await supabase.rpc('exec', { sql }).catch(() => ({ error: { message: 'rpc not available' } }))
    if (error) {
      console.log('Note:', error.message)
    }
  }
  
  // Try inserting a test story to verify table exists
  const { error: testError } = await supabase.from('stories').select('id').limit(1)
  if (testError) {
    console.log('stories table check:', testError.message)
  } else {
    console.log('✅ stories table: OK')
  }
  
  const { error: bmError } = await supabase.from('bookmarks').select('id').limit(1)
  if (bmError) {
    console.log('bookmarks table check:', bmError.message)
  } else {
    console.log('✅ bookmarks table: OK')
  }
  
  const { error: wdError } = await supabase.from('withdrawal_requests').select('id').limit(1)
  if (wdError) {
    console.log('withdrawal_requests table check:', wdError.message)
  } else {
    console.log('✅ withdrawal_requests table: OK')
  }
}

run().catch(console.error)
