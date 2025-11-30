-- ============================================================================
-- Admin Dashboard Schema for Engezna (إنجزنا)
-- لوحة تحكم المشرفين
-- ============================================================================
-- Version: 1.0
-- Created: 2025-01-30
-- Description: Complete admin dashboard schema with roles, permissions,
--              tasks, approvals, support tickets, and internal messaging
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Admin roles
CREATE TYPE admin_role AS ENUM (
  'super_admin',       -- المدير التنفيذي - صلاحيات كاملة
  'general_moderator', -- مشرف عام - إدارة المتاجر والطلبات
  'support',           -- مشرف دعم فني - التذاكر والنزاعات
  'finance'            -- مشرف مالي - التسويات والتقارير
);

-- Task status
CREATE TYPE task_status AS ENUM (
  'new',           -- جديدة
  'accepted',      -- تم القبول
  'in_progress',   -- قيد التنفيذ
  'pending',       -- في الانتظار
  'completed',     -- مكتملة
  'cancelled'      -- ملغاة
);

-- Task priority
CREATE TYPE task_priority AS ENUM (
  'urgent',  -- عاجلة
  'high',    -- عالية
  'medium',  -- متوسطة
  'low'      -- منخفضة
);

-- Approval status
CREATE TYPE approval_status AS ENUM (
  'pending',              -- في الانتظار
  'approved',             -- موافق عليه
  'approved_with_changes', -- موافق مع تعديلات
  'rejected',             -- مرفوض
  'cancelled'             -- ملغى
);

-- Ticket status
CREATE TYPE ticket_status AS ENUM (
  'open',         -- مفتوحة
  'in_progress',  -- قيد المعالجة
  'waiting',      -- في انتظار رد العميل
  'resolved',     -- تم الحل
  'closed'        -- مغلقة
);

-- Ticket priority
CREATE TYPE ticket_priority AS ENUM (
  'urgent',  -- عاجلة
  'high',    -- عالية
  'medium',  -- متوسطة
  'low'      -- منخفضة
);

-- Announcement type
CREATE TYPE announcement_type AS ENUM (
  'urgent',     -- عاجل
  'important',  -- مهم
  'info'        -- إعلامي
);

-- ============================================================================
-- ADMIN USERS TABLE (مستخدمو الإدارة)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role admin_role NOT NULL DEFAULT 'general_moderator',

  -- Permissions (JSONB for flexibility)
  permissions JSONB DEFAULT '{
    "providers": {"view": true, "approve": false, "edit": false, "delete": false},
    "orders": {"view": true, "cancel": false, "refund": false},
    "customers": {"view": true, "ban": false, "edit": false},
    "finance": {"view": false, "settlements": false, "reports": false},
    "support": {"view": true, "assign": false, "resolve": false},
    "team": {"view": false, "manage": false},
    "settings": {"view": false, "edit": false},
    "analytics": {"view": true}
  }'::JSONB,

  is_active BOOLEAN DEFAULT true,
  last_active_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  UNIQUE(user_id)
);

CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_users_active ON admin_users(is_active);

-- ============================================================================
-- ACTIVITY LOG TABLE (سجل النشاطات)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,

  -- Action details
  action_type VARCHAR(100) NOT NULL, -- 'approve_provider', 'reject_provider', 'cancel_order', 'refund', 'ban_customer', etc.
  entity_type VARCHAR(50), -- 'provider', 'order', 'customer', 'ticket', 'settlement', 'task', 'approval'
  entity_id UUID,

  -- Details (JSONB for flexibility)
  details JSONB,

  -- Old and new values for auditing
  old_value JSONB,
  new_value JSONB,

  -- Request metadata
  ip_address VARCHAR(45),
  user_agent TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_activity_log_admin ON activity_log(admin_id);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_action ON activity_log(action_type);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);

-- ============================================================================
-- SUPPORT TICKETS TABLE (تذاكر الدعم)
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(20) UNIQUE NOT NULL DEFAULT ('TKT-' || lpad(nextval('ticket_number_seq')::text, 6, '0')),

  -- Relationships
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- العميل صاحب التذكرة
  provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL, -- المتجر المعني (إن وجد)
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL, -- الطلب المعني (إن وجد)

  -- Ticket details
  type VARCHAR(50) NOT NULL, -- 'payment', 'delivery', 'quality', 'provider_issue', 'account', 'other'
  source VARCHAR(50) DEFAULT 'customer_app', -- 'customer_app', 'provider_app', 'admin', 'phone', 'email'
  priority ticket_priority DEFAULT 'medium',
  status ticket_status DEFAULT 'open',

  -- Content
  subject TEXT NOT NULL,
  description TEXT,

  -- Assignment
  assigned_to UUID REFERENCES admin_users(id) ON DELETE SET NULL,

  -- Resolution
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,

  -- For disputes - amount in question
  disputed_amount DECIMAL(10,2),
  refund_amount DECIMAL(10,2),

  -- Metadata
  metadata JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_provider ON support_tickets(provider_id);
CREATE INDEX idx_support_tickets_order ON support_tickets(order_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_created ON support_tickets(created_at DESC);

-- ============================================================================
-- TICKET MESSAGES TABLE (رسائل التذاكر)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,

  -- Sender info
  sender_type VARCHAR(20) NOT NULL, -- 'customer', 'provider', 'admin'
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Message content
  message TEXT NOT NULL,
  attachments JSONB, -- Array of attachment URLs

  -- For admin messages
  is_internal BOOLEAN DEFAULT false, -- ملاحظات داخلية غير مرئية للعميل

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX idx_ticket_messages_created ON ticket_messages(created_at);

-- ============================================================================
-- ADMIN TASKS TABLE (المهام والأوامر)
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS task_number_seq START 1;

CREATE TABLE IF NOT EXISTS public.admin_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_number VARCHAR(20) UNIQUE NOT NULL DEFAULT ('TSK-' || lpad(nextval('task_number_seq')::text, 6, '0')),

  -- Task details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50), -- 'provider_review', 'dispute', 'support', 'report', 'financial', 'investigation', 'other'
  priority task_priority DEFAULT 'medium',
  status task_status DEFAULT 'new',
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),

  -- Assignment
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  cc_to UUID[], -- Array of admin_user IDs for CC

  -- Timing
  deadline TIMESTAMP WITH TIME ZONE,
  reminder_before INTERVAL,
  auto_escalate BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false, -- يتطلب موافقة المدير على النتيجة

  -- Related entities
  related_provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL,
  related_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  related_ticket_id UUID REFERENCES support_tickets(id) ON DELETE SET NULL,
  related_customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Attachments
  attachments JSONB,

  -- Status timestamps
  accepted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_admin_tasks_assigned ON admin_tasks(assigned_to);
CREATE INDEX idx_admin_tasks_created_by ON admin_tasks(created_by);
CREATE INDEX idx_admin_tasks_status ON admin_tasks(status);
CREATE INDEX idx_admin_tasks_priority ON admin_tasks(priority);
CREATE INDEX idx_admin_tasks_deadline ON admin_tasks(deadline);
CREATE INDEX idx_admin_tasks_created ON admin_tasks(created_at DESC);

-- ============================================================================
-- TASK UPDATES TABLE (تحديثات المهام)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.task_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES admin_tasks(id) ON DELETE CASCADE NOT NULL,
  admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,

  -- Update details
  update_type VARCHAR(50), -- 'status_change', 'progress_update', 'comment', 'attachment', 'reassign'
  old_status task_status,
  new_status task_status,
  progress_percentage INTEGER,
  comment TEXT,
  attachments JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_task_updates_task ON task_updates(task_id);
CREATE INDEX idx_task_updates_created ON task_updates(created_at);

-- ============================================================================
-- APPROVAL REQUESTS TABLE (طلبات الموافقة)
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS approval_number_seq START 1;

CREATE TABLE IF NOT EXISTS public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number VARCHAR(20) UNIQUE NOT NULL DEFAULT ('APR-' || lpad(nextval('approval_number_seq')::text, 6, '0')),

  -- Request details
  type VARCHAR(50) NOT NULL, -- 'refund', 'customer_ban', 'provider_suspend', 'commission_change', 'settlement_adjust', 'promo_create', 'other'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority task_priority DEFAULT 'medium',
  status approval_status DEFAULT 'pending',

  -- Requester and approver
  requested_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  decided_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,

  -- For financial requests
  amount DECIMAL(10,2),

  -- Related entities
  related_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  related_provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL,
  related_customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  related_ticket_id UUID REFERENCES support_tickets(id) ON DELETE SET NULL,

  -- Justification
  justification TEXT NOT NULL,
  attachments JSONB,

  -- Decision
  decision_notes TEXT,
  follow_up_task_id UUID REFERENCES admin_tasks(id) ON DELETE SET NULL,

  decided_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_approval_requests_requested_by ON approval_requests(requested_by);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_type ON approval_requests(type);
CREATE INDEX idx_approval_requests_created ON approval_requests(created_at DESC);

-- ============================================================================
-- APPROVAL DISCUSSIONS TABLE (مناقشات الموافقات)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.approval_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id UUID REFERENCES approval_requests(id) ON DELETE CASCADE NOT NULL,
  admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,

  message TEXT NOT NULL,
  attachments JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_approval_discussions_approval ON approval_discussions(approval_id);
CREATE INDEX idx_approval_discussions_created ON approval_discussions(created_at);

-- ============================================================================
-- INTERNAL MESSAGES TABLE (الرسائل الداخلية)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.internal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL, -- لتجميع الرسائل في محادثة واحدة

  sender_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  recipient_ids UUID[] NOT NULL, -- Array of admin_user IDs

  subject VARCHAR(255),
  body TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal', -- 'urgent', 'normal'
  attachments JSONB,

  -- Related items
  related_approval_id UUID REFERENCES approval_requests(id) ON DELETE SET NULL,
  related_task_id UUID REFERENCES admin_tasks(id) ON DELETE SET NULL,

  -- Read tracking
  read_by UUID[], -- Array of admin_user IDs who read it
  read_confirmations JSONB, -- {admin_id: timestamp}

  is_broadcast BOOLEAN DEFAULT false, -- رسالة للجميع

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_internal_messages_sender ON internal_messages(sender_id);
CREATE INDEX idx_internal_messages_conversation ON internal_messages(conversation_id);
CREATE INDEX idx_internal_messages_created ON internal_messages(created_at DESC);

-- ============================================================================
-- ANNOUNCEMENTS TABLE (الإعلانات والتعميمات)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type announcement_type DEFAULT 'info',

  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,

  -- Targeting
  target_audience VARCHAR(50) DEFAULT 'all', -- 'all', 'specific', 'by_role'
  target_admin_ids UUID[], -- For specific targeting
  target_role admin_role, -- For role-based targeting

  -- Display options
  is_pinned BOOLEAN DEFAULT false,
  require_read_confirmation BOOLEAN DEFAULT false,

  attachments JSONB,
  read_by UUID[], -- Array of admin_user IDs

  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_announcements_type ON announcements(type);
CREATE INDEX idx_announcements_pinned ON announcements(is_pinned);
CREATE INDEX idx_announcements_published ON announcements(published_at DESC);

-- ============================================================================
-- ADMIN NOTIFICATIONS TABLE (إشعارات المشرفين)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_users(id) ON DELETE CASCADE NOT NULL,

  type VARCHAR(50) NOT NULL, -- 'task', 'approval', 'message', 'announcement', 'reminder', 'escalation', 'system'
  title VARCHAR(255) NOT NULL,
  body TEXT,

  -- Related entities
  related_task_id UUID REFERENCES admin_tasks(id) ON DELETE CASCADE,
  related_approval_id UUID REFERENCES approval_requests(id) ON DELETE CASCADE,
  related_message_id UUID REFERENCES internal_messages(id) ON DELETE CASCADE,
  related_announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  related_ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,

  -- Read status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_admin_notifications_admin ON admin_notifications(admin_id);
CREATE INDEX idx_admin_notifications_read ON admin_notifications(is_read);
CREATE INDEX idx_admin_notifications_created ON admin_notifications(created_at DESC);

-- ============================================================================
-- PLATFORM SETTINGS TABLE (إعدادات المنصة)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  category VARCHAR(50), -- 'general', 'commission', 'payment', 'notifications', 'regions', 'security'

  updated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default settings
INSERT INTO platform_settings (key, value, description, category) VALUES
  ('default_commission_rate', '{"value": 6, "type": "percentage"}'::JSONB, 'نسبة العمولة الافتراضية', 'commission'),
  ('commission_tiers', '[{"min_orders": 0, "max_orders": 50, "rate": 7}, {"min_orders": 51, "max_orders": 200, "rate": 6}, {"min_orders": 201, "max_orders": null, "rate": 5}]'::JSONB, 'مستويات العمولة حسب عدد الطلبات', 'commission'),
  ('min_refund_approval', '{"amount": 100, "currency": "EGP"}'::JSONB, 'الحد الأدنى للاسترداد الذي يتطلب موافقة', 'finance'),
  ('active_regions', '["beni_suef_city", "beni_suef_university"]'::JSONB, 'المناطق النشطة للتوصيل', 'regions'),
  ('support_hours', '{"start": "09:00", "end": "22:00", "timezone": "Africa/Cairo"}'::JSONB, 'ساعات عمل الدعم الفني', 'general')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- UPDATE SETTLEMENTS TABLE (تحديث جدول التسويات)
-- ============================================================================

ALTER TABLE public.settlements
  ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER admin_users_updated_at BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER support_tickets_updated_at BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER admin_tasks_updated_at BEFORE UPDATE ON admin_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER approval_requests_updated_at BEFORE UPDATE ON approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER announcements_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all admin tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Admin Users Policies
-- ----------------------------------------------------------------------------

-- Admins can view all admin users
CREATE POLICY "Admins can view admin users"
  ON admin_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Super admins can manage admin users
CREATE POLICY "Super admins can manage admin users"
  ON admin_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true
    )
  );

-- Users can view their own admin record
CREATE POLICY "Users can view own admin record"
  ON admin_users FOR SELECT
  USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Activity Log Policies
-- ----------------------------------------------------------------------------

-- Admins can view activity log
CREATE POLICY "Admins can view activity log"
  ON activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- System can insert activity log
CREATE POLICY "System can insert activity log"
  ON activity_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ----------------------------------------------------------------------------
-- Support Tickets Policies
-- ----------------------------------------------------------------------------

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets"
  ON support_tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Admins can manage tickets
CREATE POLICY "Admins can manage tickets"
  ON support_tickets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Customers can view their own tickets
CREATE POLICY "Customers can view own tickets"
  ON support_tickets FOR SELECT
  USING (user_id = auth.uid());

-- Customers can create tickets
CREATE POLICY "Customers can create tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Ticket Messages Policies
-- ----------------------------------------------------------------------------

-- Admins can view all ticket messages
CREATE POLICY "Admins can view ticket messages"
  ON ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Admins can send messages
CREATE POLICY "Admins can send ticket messages"
  ON ticket_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Customers can view non-internal messages on their tickets
CREATE POLICY "Customers can view own ticket messages"
  ON ticket_messages FOR SELECT
  USING (
    is_internal = false AND
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE id = ticket_messages.ticket_id AND user_id = auth.uid()
    )
  );

-- Customers can send messages on their tickets
CREATE POLICY "Customers can send ticket messages"
  ON ticket_messages FOR INSERT
  WITH CHECK (
    sender_type = 'customer' AND
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE id = ticket_messages.ticket_id AND user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- Admin Tasks Policies
-- ----------------------------------------------------------------------------

-- Admins can view tasks assigned to them or created by them
CREATE POLICY "Admins can view their tasks"
  ON admin_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND (
        au.id = admin_tasks.assigned_to
        OR au.id = admin_tasks.created_by
        OR au.id = ANY(admin_tasks.cc_to)
        OR au.role = 'super_admin'
      )
    )
  );

-- Super admins can manage all tasks
CREATE POLICY "Super admins can manage all tasks"
  ON admin_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true
    )
  );

-- Admins can update tasks assigned to them
CREATE POLICY "Admins can update assigned tasks"
  ON admin_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND id = admin_tasks.assigned_to AND is_active = true
    )
  );

-- ----------------------------------------------------------------------------
-- Task Updates Policies
-- ----------------------------------------------------------------------------

-- Admins can view task updates for their tasks
CREATE POLICY "Admins can view task updates"
  ON task_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_tasks t
      JOIN admin_users au ON au.user_id = auth.uid()
      WHERE t.id = task_updates.task_id
      AND au.is_active = true
      AND (
        au.id = t.assigned_to
        OR au.id = t.created_by
        OR au.id = ANY(t.cc_to)
        OR au.role = 'super_admin'
      )
    )
  );

-- Admins can add task updates
CREATE POLICY "Admins can add task updates"
  ON task_updates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ----------------------------------------------------------------------------
-- Approval Requests Policies
-- ----------------------------------------------------------------------------

-- Admins can view approval requests
CREATE POLICY "Admins can view approval requests"
  ON approval_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND (
        au.id = approval_requests.requested_by
        OR au.role = 'super_admin'
      )
    )
  );

-- Admins can create approval requests
CREATE POLICY "Admins can create approval requests"
  ON approval_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Super admins can decide on approval requests
CREATE POLICY "Super admins can decide approvals"
  ON approval_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true
    )
  );

-- ----------------------------------------------------------------------------
-- Approval Discussions Policies
-- ----------------------------------------------------------------------------

-- Admins can view discussions on their approvals
CREATE POLICY "Admins can view approval discussions"
  ON approval_discussions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM approval_requests ar
      JOIN admin_users au ON au.user_id = auth.uid()
      WHERE ar.id = approval_discussions.approval_id
      AND au.is_active = true
      AND (
        au.id = ar.requested_by
        OR au.role = 'super_admin'
      )
    )
  );

-- Admins can add to discussions
CREATE POLICY "Admins can add approval discussions"
  ON approval_discussions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ----------------------------------------------------------------------------
-- Internal Messages Policies
-- ----------------------------------------------------------------------------

-- Admins can view messages sent to them or by them
CREATE POLICY "Admins can view their messages"
  ON internal_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
      AND (
        id = internal_messages.sender_id
        OR id = ANY(internal_messages.recipient_ids)
        OR internal_messages.is_broadcast = true
      )
    )
  );

-- Admins can send messages
CREATE POLICY "Admins can send messages"
  ON internal_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Admins can update messages they sent
CREATE POLICY "Admins can update their messages"
  ON internal_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND id = internal_messages.sender_id AND is_active = true
    )
  );

-- ----------------------------------------------------------------------------
-- Announcements Policies
-- ----------------------------------------------------------------------------

-- Admins can view announcements targeted to them
CREATE POLICY "Admins can view announcements"
  ON announcements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND (
        announcements.target_audience = 'all'
        OR au.id = ANY(announcements.target_admin_ids)
        OR au.role = announcements.target_role
        OR au.role = 'super_admin'
      )
    )
  );

-- Super admins can manage announcements
CREATE POLICY "Super admins can manage announcements"
  ON announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true
    )
  );

-- ----------------------------------------------------------------------------
-- Admin Notifications Policies
-- ----------------------------------------------------------------------------

-- Admins can view their own notifications
CREATE POLICY "Admins can view own notifications"
  ON admin_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND id = admin_notifications.admin_id AND is_active = true
    )
  );

-- Admins can update their own notifications
CREATE POLICY "Admins can update own notifications"
  ON admin_notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND id = admin_notifications.admin_id AND is_active = true
    )
  );

-- System can insert notifications
CREATE POLICY "System can insert notifications"
  ON admin_notifications FOR INSERT
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- Platform Settings Policies
-- ----------------------------------------------------------------------------

-- Admins can view settings
CREATE POLICY "Admins can view settings"
  ON platform_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Super admins can manage settings
CREATE POLICY "Super admins can manage settings"
  ON platform_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to log admin activity
CREATE OR REPLACE FUNCTION log_admin_activity(
  p_action_type VARCHAR(100),
  p_entity_type VARCHAR(50),
  p_entity_id UUID,
  p_details JSONB DEFAULT NULL,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_admin_id UUID;
  v_log_id UUID;
BEGIN
  -- Get admin_id for current user
  SELECT id INTO v_admin_id FROM admin_users WHERE user_id = auth.uid() AND is_active = true;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'User is not an active admin';
  END IF;

  INSERT INTO activity_log (admin_id, action_type, entity_type, entity_id, details, old_value, new_value)
  VALUES (v_admin_id, p_action_type, p_entity_type, p_entity_id, p_details, p_old_value, p_new_value)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create admin notification
CREATE OR REPLACE FUNCTION create_admin_notification(
  p_admin_id UUID,
  p_type VARCHAR(50),
  p_title VARCHAR(255),
  p_body TEXT DEFAULT NULL,
  p_related_task_id UUID DEFAULT NULL,
  p_related_approval_id UUID DEFAULT NULL,
  p_related_ticket_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO admin_notifications (admin_id, type, title, body, related_task_id, related_approval_id, related_ticket_id)
  VALUES (p_admin_id, p_type, p_title, p_body, p_related_task_id, p_related_approval_id, p_related_ticket_id)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VIEWS FOR DASHBOARD
-- ============================================================================

-- Dashboard KPIs view
CREATE OR REPLACE VIEW admin_dashboard_kpis AS
SELECT
  -- Orders stats
  (SELECT COUNT(*) FROM orders WHERE created_at >= CURRENT_DATE) AS orders_today,
  (SELECT COUNT(*) FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS orders_week,
  (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status = 'delivered' AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS gmv_month,

  -- Providers stats
  (SELECT COUNT(*) FROM providers WHERE status IN ('open', 'closed', 'temporarily_paused')) AS active_providers,
  (SELECT COUNT(*) FROM providers WHERE status = 'pending_approval') AS pending_providers,

  -- Customers stats
  (SELECT COUNT(*) FROM profiles WHERE role = 'customer') AS total_customers,
  (SELECT COUNT(*) FROM profiles WHERE role = 'customer' AND created_at >= CURRENT_DATE) AS new_customers_today,

  -- Support stats
  (SELECT COUNT(*) FROM support_tickets WHERE status = 'open') AS open_tickets,
  (SELECT COUNT(*) FROM approval_requests WHERE status = 'pending') AS pending_approvals,

  -- Financial stats
  (SELECT COALESCE(SUM(platform_commission), 0) FROM orders WHERE status = 'delivered' AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS commissions_month,
  (SELECT COUNT(*) FROM settlements WHERE status = 'pending') AS pending_settlements;

-- ============================================================================
-- END OF ADMIN DASHBOARD SCHEMA
-- ============================================================================
