-- Add 'online' to payment_method enum for Kashier integration
-- This is a generic value for online payments (replaces specific gateways like fawry)

ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'online';

-- Add comment for documentation
COMMENT ON TYPE payment_method IS 'Payment methods: cash (COD), online (Kashier/card payments), fawry, vodafone_cash, credit_card (legacy)';
