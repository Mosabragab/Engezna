-- ============================================================================
-- Email Templates System
-- Allows marketing team to manage email templates without code changes
-- ============================================================================

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template identification
  slug TEXT NOT NULL UNIQUE, -- e.g., 'merchant-welcome', 'order-received'
  name TEXT NOT NULL, -- Human readable name in Arabic
  description TEXT, -- Description of when this template is used

  -- Template content
  subject TEXT NOT NULL, -- Email subject line
  html_content TEXT NOT NULL, -- Full HTML template with {{variables}}

  -- Template variables documentation
  available_variables JSONB DEFAULT '[]'::jsonb, -- ['merchantName', 'storeName', etc.]

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  category TEXT DEFAULT 'merchant', -- 'merchant', 'customer', 'admin', 'marketing'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create index for quick lookups
CREATE INDEX idx_email_templates_slug ON email_templates(slug);
CREATE INDEX idx_email_templates_category ON email_templates(category);
CREATE INDEX idx_email_templates_active ON email_templates(is_active);

-- Create email_template_versions table for history/rollback
CREATE TABLE IF NOT EXISTS email_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,

  -- Version content
  version_number INTEGER NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,

  -- Who made the change
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  change_note TEXT -- Optional note about what changed
);

CREATE INDEX idx_template_versions_template ON email_template_versions(template_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_email_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_template_timestamp();

-- Trigger to save version history on update
CREATE OR REPLACE FUNCTION save_email_template_version()
RETURNS TRIGGER AS $$
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
      NEW.updated_by
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_templates_version_history
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION save_email_template_version();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_template_versions ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for API)
CREATE POLICY "Service role full access on email_templates"
  ON email_templates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on email_template_versions"
  ON email_template_versions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin users can view and edit templates
CREATE POLICY "Admin users can view email_templates"
  ON email_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Admin users can update email_templates"
  ON email_templates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
      AND role IN ('super_admin', 'admin', 'marketing_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
      AND role IN ('super_admin', 'admin', 'marketing_manager')
    )
  );

CREATE POLICY "Admin users can view email_template_versions"
  ON email_template_versions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- ============================================================================
-- Add permission for email templates management
-- ============================================================================

-- Add to permissions if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
    INSERT INTO permissions (code, resource_code, action_code, name_ar, name_en, description_ar, description_en, severity)
    VALUES
      ('email_templates.view', 'email_templates', 'view', 'عرض قوالب الإيميل', 'View Email Templates', 'عرض جميع قوالب البريد الإلكتروني', 'View all email templates', 'low'),
      ('email_templates.edit', 'email_templates', 'edit', 'تعديل قوالب الإيميل', 'Edit Email Templates', 'تعديل قوالب البريد الإلكتروني', 'Edit email templates', 'medium')
    ON CONFLICT (code) DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE email_templates IS 'Stores email templates that can be edited by marketing team';
COMMENT ON TABLE email_template_versions IS 'Version history for email templates for rollback capability';
COMMENT ON COLUMN email_templates.slug IS 'Unique identifier used in code to fetch template';
COMMENT ON COLUMN email_templates.available_variables IS 'JSON array of variable names that can be used in template';
