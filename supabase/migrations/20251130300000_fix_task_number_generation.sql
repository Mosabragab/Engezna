-- ============================================================================
-- Fix task_number generation for admin_tasks
-- This migration ensures task_number is automatically generated via trigger
-- ============================================================================

-- Make sure the sequence exists
CREATE SEQUENCE IF NOT EXISTS task_number_seq START 1;

-- Create a function to generate task_number
CREATE OR REPLACE FUNCTION generate_task_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate task_number if it's NULL
  IF NEW.task_number IS NULL OR NEW.task_number = '' THEN
    NEW.task_number := 'TSK-' || lpad(nextval('task_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_task_number ON admin_tasks;

-- Create trigger to auto-generate task_number before insert
CREATE TRIGGER set_task_number
  BEFORE INSERT ON admin_tasks
  FOR EACH ROW
  EXECUTE FUNCTION generate_task_number();

-- Also ensure column allows DEFAULT to be used (in case it was changed)
-- First, check if any records exist without task_number and fix them
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM admin_tasks WHERE task_number IS NULL OR task_number = '' LOOP
    UPDATE admin_tasks
    SET task_number = 'TSK-' || lpad(nextval('task_number_seq')::text, 6, '0')
    WHERE id = r.id;
  END LOOP;
END $$;
