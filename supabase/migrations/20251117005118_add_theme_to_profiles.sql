-- Add theme preference column to profiles table
-- Stores user's preferred theme (e.g., 'red-light', 'blue-dark', 'monochrome')

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS theme text;

