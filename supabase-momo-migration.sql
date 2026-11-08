-- ─── MoMo Payment + Reference Upload Migration ────────────────────────────────
-- Run this in your Supabase SQL editor

-- 1. Add new columns to subscriptions table
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'pesapal',
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS reference_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by text;

-- 2. Create payment-references storage bucket (safe to re-run)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-references', 'payment-references', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies for payment-references bucket
-- Drop first so re-running is safe
DROP POLICY IF EXISTS "Users can upload own payment references" ON storage.objects;
CREATE POLICY "Users can upload own payment references"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-references'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Payment references are publicly viewable" ON storage.objects;
CREATE POLICY "Payment references are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-references');

-- 4. Allow users to update their own pending subscription (to attach reference URL)
DROP POLICY IF EXISTS "Users can upload reference on own subscription" ON subscriptions;
CREATE POLICY "Users can upload reference on own subscription"
ON subscriptions FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
