-- Add userId and solAmount columns to failed_transactions table
ALTER TABLE failed_transactions ADD COLUMN user_id TEXT;
ALTER TABLE failed_transactions ADD COLUMN sol_amount REAL;
