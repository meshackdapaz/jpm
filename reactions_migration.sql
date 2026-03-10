-- Add reaction_type to public.likes
ALTER TABLE public.likes ADD COLUMN IF NOT EXISTS reaction_type text DEFAULT 'like';

-- Ensure it's one of the supported types (optional but good for data integrity)
-- ALTER TABLE public.likes ADD CONSTRAINT reaction_type_check CHECK (reaction_type IN ('like', 'laugh', 'fire'));

-- Enable Realtime for likes table if not already enabled
BEGIN;
  -- Add table to publication if it exists
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
    END IF;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
COMMIT;
