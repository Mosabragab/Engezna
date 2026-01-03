-- Fix RLS policy for email_template_versions to allow INSERT via trigger
-- The trigger save_email_template_version needs to insert records when updating templates

-- Allow admin users to insert into email_template_versions (for the trigger)
CREATE POLICY "Admin users can insert email_template_versions"
  ON email_template_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
      AND role IN ('super_admin', 'admin', 'marketing_manager')
    )
  );

-- Alternative: Make the trigger run with SECURITY DEFINER to bypass RLS
-- This is actually a better approach for internal triggers

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS email_templates_version_history ON email_templates;
DROP FUNCTION IF EXISTS save_email_template_version();

-- Recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION save_email_template_version()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Only save if content actually changed
  IF OLD.html_content IS DISTINCT FROM NEW.html_content
     OR OLD.subject IS DISTINCT FROM NEW.subject THEN

    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_version
    FROM email_template_versions
    WHERE template_id = OLD.id;

    INSERT INTO email_template_versions (
      template_id,
      version_number,
      subject,
      html_content,
      created_by
    ) VALUES (
      OLD.id,
      next_version,
      OLD.subject,
      OLD.html_content,
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER email_templates_version_history
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION save_email_template_version();

-- Add comment
COMMENT ON FUNCTION save_email_template_version() IS 'Saves previous version of email template before update. Uses SECURITY DEFINER to bypass RLS for internal trigger operations.';
