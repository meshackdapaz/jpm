-- Add is_approved column to comments table
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;

-- Update existing comments to be approved
UPDATE public.comments SET is_approved = TRUE WHERE is_approved IS NULL;
