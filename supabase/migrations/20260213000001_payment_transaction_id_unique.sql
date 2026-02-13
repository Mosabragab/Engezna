-- Add unique constraint on payment_transaction_id to prevent duplicate payment processing
-- This ensures that even if Kashier sends the same webhook multiple times,
-- only the first one can store the transaction ID.
--
-- NOTE: NULL values are allowed (orders without online payment won't have a transaction ID)
-- PostgreSQL unique constraints allow multiple NULLs by default.

ALTER TABLE orders
ADD CONSTRAINT orders_payment_transaction_id_unique
UNIQUE (payment_transaction_id);

-- The existing index idx_orders_payment_transaction_id is now redundant
-- (unique constraint creates an implicit index), but keeping it is harmless.
