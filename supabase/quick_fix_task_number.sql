-- Quick fix for task_number generation issue
-- Run this in Supabase SQL Editor

-- 1. Make sure the sequence exists
CREATE SEQUENCE IF NOT EXISTS task_number_seq START 1;

-- 2. Create a function to generate task_number
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

-- 3. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_task_number ON admin_tasks;

-- 4. Create trigger to auto-generate task_number before insert
CREATE TRIGGER set_task_number
  BEFORE INSERT ON admin_tasks
  FOR EACH ROW
  EXECUTE FUNCTION generate_task_number();

-- 5. Fix any existing records without task_number
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

-- Optional: Verify the fix worked
SELECT 'Task number generation fix applied successfully' as status;
