-- ============================================================================
-- Firebase Cloud Messaging (FCM) Tables
-- Push Notifications Infrastructure for Engezna
-- ============================================================================

-- ============================================================================
-- 1. FCM TOKENS TABLE - Store device tokens for push notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Token Information
  token text NOT NULL,
  device_type text DEFAULT 'web' CHECK (device_type IN ('web', 'android', 'ios')),
  device_name text, -- Optional device identifier

  -- Browser/App info for debugging
  user_agent text,

  -- Status
  is_active boolean DEFAULT true,
  last_used_at timestamp with time zone DEFAULT now(),
  failed_attempts int DEFAULT 0, -- Track failed sends for cleanup

  -- Timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Each token must be unique
  UNIQUE(token)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user ON public.fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_active ON public.fcm_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_active ON public.fcm_tokens(user_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
CREATE POLICY "Users can view own tokens"
  ON public.fcm_tokens FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tokens"
  ON public.fcm_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tokens"
  ON public.fcm_tokens FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own tokens"
  ON public.fcm_tokens FOR DELETE
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER fcm_tokens_updated_at
  BEFORE UPDATE ON public.fcm_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 2. NOTIFICATION PREFERENCES TABLE - User notification settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Customer Preferences
  order_updates boolean DEFAULT true,        -- Order status changes
  promotions boolean DEFAULT true,           -- Promotional offers
  chat_messages boolean DEFAULT true,        -- New chat messages

  -- Provider/Staff Preferences
  new_orders boolean DEFAULT true,           -- New order alerts (with sound)
  order_cancellations boolean DEFAULT true,  -- Order cancelled alerts
  low_stock_alerts boolean DEFAULT true,     -- Low stock warnings
  new_reviews boolean DEFAULT true,          -- New review notifications

  -- Admin Preferences
  new_providers boolean DEFAULT true,        -- New provider registrations
  complaints boolean DEFAULT true,           -- New complaints/tickets
  system_alerts boolean DEFAULT true,        -- System notifications

  -- Sound Settings
  sound_enabled boolean DEFAULT true,

  -- Quiet Hours (optional)
  quiet_hours_enabled boolean DEFAULT false,
  quiet_hours_start time,  -- e.g., '22:00'
  quiet_hours_end time,    -- e.g., '08:00'

  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can manage their own preferences
CREATE POLICY "Users can view own preferences"
  ON public.notification_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 3. HELPER FUNCTIONS
-- ============================================================================

-- Function to upsert FCM token (insert or update if exists)
CREATE OR REPLACE FUNCTION public.upsert_fcm_token(
  p_token text,
  p_device_type text DEFAULT 'web',
  p_device_name text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Try to update existing token or insert new one
  INSERT INTO public.fcm_tokens (
    user_id,
    token,
    device_type,
    device_name,
    user_agent,
    is_active,
    last_used_at,
    failed_attempts
  ) VALUES (
    v_user_id,
    p_token,
    p_device_type,
    p_device_name,
    p_user_agent,
    true,
    now(),
    0
  )
  ON CONFLICT (token) DO UPDATE SET
    user_id = v_user_id,
    device_type = p_device_type,
    device_name = COALESCE(p_device_name, fcm_tokens.device_name),
    user_agent = COALESCE(p_user_agent, fcm_tokens.user_agent),
    is_active = true,
    last_used_at = now(),
    failed_attempts = 0,
    updated_at = now()
  RETURNING id INTO v_token_id;

  RETURN v_token_id;
END;
$$;

-- Function to mark token as invalid (called when FCM returns error)
CREATE OR REPLACE FUNCTION public.mark_fcm_token_invalid(
  p_token text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.fcm_tokens
  SET
    is_active = false,
    failed_attempts = failed_attempts + 1,
    updated_at = now()
  WHERE token = p_token;
END;
$$;

-- Function to get active FCM tokens for a user
CREATE OR REPLACE FUNCTION public.get_user_fcm_tokens(
  p_user_id uuid
)
RETURNS TABLE (token text, device_type text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT ft.token, ft.device_type
  FROM public.fcm_tokens ft
  WHERE ft.user_id = p_user_id
  AND ft.is_active = true
  AND ft.failed_attempts < 3;
END;
$$;

-- Function to get FCM tokens for provider staff with specific permission
CREATE OR REPLACE FUNCTION public.get_provider_staff_tokens(
  p_provider_id uuid,
  p_permission text DEFAULT NULL
)
RETURNS TABLE (user_id uuid, token text, device_type text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.user_id,
    ft.token,
    ft.device_type
  FROM public.provider_staff ps
  JOIN public.fcm_tokens ft ON ft.user_id = ps.user_id AND ft.is_active = true
  WHERE ps.provider_id = p_provider_id
  AND ps.is_active = true
  AND ft.failed_attempts < 3
  AND (
    p_permission IS NULL
    OR (p_permission = 'can_manage_orders' AND ps.can_manage_orders = true)
    OR (p_permission = 'can_manage_menu' AND ps.can_manage_menu = true)
    OR (p_permission = 'can_manage_customers' AND ps.can_manage_customers = true)
    OR (p_permission = 'can_view_analytics' AND ps.can_view_analytics = true)
    OR (p_permission = 'can_manage_offers' AND ps.can_manage_offers = true)
    OR ps.role = 'owner'  -- Owner always gets all notifications
  );
END;
$$;

-- Function to cleanup old/invalid tokens (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_invalid_fcm_tokens()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count int;
BEGIN
  -- Delete tokens that:
  -- 1. Have 3+ failed attempts
  -- 2. Haven't been used in 90 days
  -- 3. Are marked as inactive for 30+ days
  DELETE FROM public.fcm_tokens
  WHERE
    failed_attempts >= 3
    OR (last_used_at < now() - interval '90 days')
    OR (is_active = false AND updated_at < now() - interval '30 days');

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$;

-- ============================================================================
-- 4. AUTO-CREATE PREFERENCES FOR NEW USERS
-- ============================================================================

-- Function to create default notification preferences for new users
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger to auto-create preferences when user profile is created
DROP TRIGGER IF EXISTS create_notification_preferences_trigger ON public.profiles;
CREATE TRIGGER create_notification_preferences_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_notification_preferences();

-- ============================================================================
-- DONE!
-- ============================================================================
