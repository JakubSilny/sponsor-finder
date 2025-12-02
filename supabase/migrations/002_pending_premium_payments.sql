-- Create table for pending premium payments (for unauthenticated users)
CREATE TABLE IF NOT EXISTS pending_premium_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  stripe_session_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  processed_at TIMESTAMP WITH TIME ZONE,
  is_processed BOOLEAN DEFAULT false
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_premium_payments_email ON pending_premium_payments(email);
CREATE INDEX IF NOT EXISTS idx_pending_premium_payments_processed ON pending_premium_payments(is_processed);

-- Enable Row Level Security
ALTER TABLE pending_premium_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only service role can access (via server-side code)
CREATE POLICY "Service role can manage pending payments"
  ON pending_premium_payments
  FOR ALL
  USING (false); -- This table is only accessible via service role, not via client

