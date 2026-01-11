-- ============================================================================
-- CUSTOM ORDER SYSTEM - Migration
-- نظام الطلب المفتوح للسوبر ماركت والصيدليات والخضروات
-- Date: January 2026
-- ============================================================================

-- ============================================================================
-- PART 1: ENUMS AND TYPES
-- ============================================================================

-- Operation mode for providers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'operation_mode') THEN
    CREATE TYPE operation_mode AS ENUM ('standard', 'custom', 'hybrid');
  END IF;
END$$;

-- Custom order input types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'custom_order_input_type') THEN
    CREATE TYPE custom_order_input_type AS ENUM ('text', 'voice', 'image', 'mixed');
  END IF;
END$$;

-- Custom order request status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'custom_request_status') THEN
    CREATE TYPE custom_request_status AS ENUM (
      'pending',           -- بانتظار التسعير
      'priced',            -- تم التسعير
      'customer_approved', -- العميل وافق
      'customer_rejected', -- العميل رفض
      'expired'            -- انتهت المهلة
    );
  END IF;
END$$;

-- Custom item availability status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_availability_status') THEN
    CREATE TYPE item_availability_status AS ENUM (
      'available',    -- متوفر
      'unavailable',  -- غير متوفر
      'partial',      -- متوفر جزئياً
      'substituted'   -- تم استبداله
    );
  END IF;
END$$;

-- Broadcast status for triple broadcast system
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'broadcast_status') THEN
    CREATE TYPE broadcast_status AS ENUM (
      'active',     -- نشط - في انتظار التسعير
      'completed',  -- مكتمل - تم اختيار فائز
      'expired',    -- منتهي - انتهت المهلة
      'cancelled'   -- ملغي - ألغاه العميل
    );
  END IF;
END$$;

-- Pricing status for orders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pricing_status') THEN
    CREATE TYPE pricing_status AS ENUM (
      'awaiting_pricing',      -- بانتظار التسعير
      'pricing_sent',          -- التسعير مرسل للعميل
      'pricing_approved',      -- العميل وافق على التسعير
      'pricing_rejected',      -- العميل رفض التسعير
      'pricing_expired'        -- انتهت مهلة الموافقة
    );
  END IF;
END$$;

-- ============================================================================
-- PART 2: PROVIDER UPDATES
-- ============================================================================

-- Add operation_mode to providers
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS operation_mode TEXT DEFAULT 'standard';

-- Add custom order settings (updated with show_price_history)
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS custom_order_settings JSONB DEFAULT '{
  "accepts_text": true,
  "accepts_voice": true,
  "accepts_image": true,
  "max_items_per_order": 50,
  "pricing_timeout_hours": 24,
  "customer_approval_timeout_hours": 2,
  "auto_cancel_after_hours": 48,
  "show_price_history": true
}'::jsonb;

-- Set operation_mode based on category
UPDATE providers
SET operation_mode = 'custom'
WHERE category IN ('grocery', 'vegetables_fruits');

-- Add pharmacy to categories if using enum (skip if using text)
-- Note: If categories is TEXT, pharmacy will work automatically

-- ============================================================================
-- PART 3: TRIPLE BROADCAST TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_order_broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Customer info
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Providers receiving this broadcast (max 3)
  provider_ids UUID[] NOT NULL,

  -- Original order content
  original_input_type TEXT NOT NULL CHECK (original_input_type IN ('text', 'voice', 'image', 'mixed')),
  original_text TEXT,
  voice_url TEXT,
  image_urls TEXT[],
  transcribed_text TEXT,
  customer_notes TEXT,

  -- Delivery info
  delivery_address_id UUID REFERENCES addresses(id),
  delivery_address JSONB,
  order_type TEXT DEFAULT 'delivery' CHECK (order_type IN ('delivery', 'pickup')),

  -- Winning order
  winning_order_id UUID,  -- References orders(id), set when customer approves

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),

  -- Timeouts
  pricing_deadline TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT max_three_providers CHECK (array_length(provider_ids, 1) <= 3)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_broadcasts_customer ON custom_order_broadcasts(customer_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON custom_order_broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_broadcasts_expires ON custom_order_broadcasts(expires_at) WHERE status = 'active';

-- ============================================================================
-- PART 4: CUSTOM ORDER REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_order_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Broadcast reference
  broadcast_id UUID REFERENCES custom_order_broadcasts(id) ON DELETE CASCADE,

  -- Order reference (created per provider)
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,

  -- Input type
  input_type TEXT NOT NULL CHECK (input_type IN ('text', 'voice', 'image', 'mixed')),

  -- Customer's original input (copied from broadcast)
  original_text TEXT,
  voice_url TEXT,
  image_urls TEXT[],
  transcribed_text TEXT,
  customer_notes TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'priced',
    'customer_approved',
    'customer_rejected',
    'expired',
    'cancelled'  -- Cancelled when another provider won
  )),

  -- Pricing summary (calculated when merchant submits)
  items_count INTEGER DEFAULT 0,
  subtotal DECIMAL(10,2) DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  priced_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  pricing_expires_at TIMESTAMPTZ,  -- When customer must approve by

  -- Unique constraint: one request per provider per broadcast
  UNIQUE(broadcast_id, provider_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_requests_order ON custom_order_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_requests_provider ON custom_order_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_requests_broadcast ON custom_order_requests(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON custom_order_requests(status);

-- ============================================================================
-- PART 5: CUSTOM ORDER ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  request_id UUID NOT NULL REFERENCES custom_order_requests(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  -- Original customer text for this item (extracted or matched)
  original_customer_text TEXT,

  -- Merchant-entered item details (FLEXIBLE NAMING)
  item_name_ar TEXT NOT NULL,
  item_name_en TEXT,
  description_ar TEXT,
  description_en TEXT,

  -- Quantity and pricing
  unit_type TEXT,  -- كيلو، علبة، قطعة، لتر
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,

  -- Availability status
  availability_status TEXT DEFAULT 'available' CHECK (availability_status IN (
    'available',
    'unavailable',
    'partial',
    'substituted'
  )),

  -- Substitute item (when original is unavailable)
  substitute_name_ar TEXT,
  substitute_name_en TEXT,
  substitute_description TEXT,
  substitute_quantity DECIMAL(10,2),
  substitute_unit_type TEXT,
  substitute_unit_price DECIMAL(10,2),
  substitute_total_price DECIMAL(10,2),

  -- Merchant notes
  merchant_notes TEXT,

  -- Display order
  display_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custom_items_request ON custom_order_items(request_id);
CREATE INDEX IF NOT EXISTS idx_custom_items_order ON custom_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_custom_items_availability ON custom_order_items(availability_status);

-- ============================================================================
-- PART 5.1: PRICE HISTORY TABLE
-- جدول تاريخ الأسعار - لميزة "تم شراؤه مسبقاً"
-- ============================================================================

-- NOTE: normalize_arabic function is defined in migration 20251216000002_arabic_normalization.sql
-- We reuse that existing function for price history matching

-- Price history table for "تم شراؤه مسبقاً" feature
CREATE TABLE IF NOT EXISTS custom_order_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Provider and Customer
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Item identification
  item_name_normalized TEXT NOT NULL,           -- Normalized for matching (using normalize_arabic)
  item_name_ar TEXT NOT NULL,                   -- Original display name
  item_name_en TEXT,                            -- English name if available

  -- Pricing info
  unit_type TEXT,                               -- كيلو، علبة، قطعة، لتر
  unit_price DECIMAL(10,2) NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  total_price DECIMAL(10,2),

  -- Source reference
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  request_id UUID REFERENCES custom_order_requests(id) ON DELETE SET NULL,
  custom_item_id UUID REFERENCES custom_order_items(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one price record per item per provider-customer pair
  -- Uses normalized name for matching
  CONSTRAINT unique_price_history UNIQUE (provider_id, customer_id, item_name_normalized)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_price_history_provider ON custom_order_price_history(provider_id);
CREATE INDEX IF NOT EXISTS idx_price_history_customer ON custom_order_price_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_price_history_provider_customer ON custom_order_price_history(provider_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_price_history_normalized_name ON custom_order_price_history(item_name_normalized);
CREATE INDEX IF NOT EXISTS idx_price_history_lookup ON custom_order_price_history(provider_id, customer_id, item_name_normalized);

-- Enable RLS
ALTER TABLE custom_order_price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for price history

-- Providers can view price history for their orders
CREATE POLICY "providers_view_price_history"
ON custom_order_price_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM providers p
    WHERE p.owner_id = auth.uid()
    AND p.id = custom_order_price_history.provider_id
  )
  OR EXISTS (
    SELECT 1 FROM provider_staff ps
    WHERE ps.user_id = auth.uid()
    AND ps.is_active = true
    AND ps.provider_id = custom_order_price_history.provider_id
  )
);

-- System can insert/update price history (via service role)
CREATE POLICY "system_manage_price_history"
ON custom_order_price_history FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Function to update price history when an order is completed
CREATE OR REPLACE FUNCTION update_price_history_from_order()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_provider_id UUID;
  v_item RECORD;
BEGIN
  -- Only trigger when order is delivered (completed)
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.order_flow = 'custom' THEN

    -- Get customer and provider from the order
    v_customer_id := NEW.customer_id;
    v_provider_id := NEW.provider_id;

    -- Loop through custom order items and update price history
    FOR v_item IN (
      SELECT
        coi.item_name_ar,
        coi.item_name_en,
        coi.unit_type,
        coi.unit_price,
        coi.quantity,
        coi.total_price,
        coi.request_id,
        coi.id as custom_item_id
      FROM custom_order_items coi
      WHERE coi.order_id = NEW.id
        AND coi.availability_status = 'available'
    ) LOOP
      -- Upsert into price history
      INSERT INTO custom_order_price_history (
        provider_id,
        customer_id,
        item_name_normalized,
        item_name_ar,
        item_name_en,
        unit_type,
        unit_price,
        quantity,
        total_price,
        order_id,
        request_id,
        custom_item_id,
        updated_at
      ) VALUES (
        v_provider_id,
        v_customer_id,
        normalize_arabic(v_item.item_name_ar),
        v_item.item_name_ar,
        v_item.item_name_en,
        v_item.unit_type,
        v_item.unit_price,
        v_item.quantity,
        v_item.total_price,
        NEW.id,
        v_item.request_id,
        v_item.custom_item_id,
        NOW()
      )
      ON CONFLICT (provider_id, customer_id, item_name_normalized)
      DO UPDATE SET
        item_name_ar = EXCLUDED.item_name_ar,
        item_name_en = EXCLUDED.item_name_en,
        unit_type = EXCLUDED.unit_type,
        unit_price = EXCLUDED.unit_price,
        quantity = EXCLUDED.quantity,
        total_price = EXCLUDED.total_price,
        order_id = EXCLUDED.order_id,
        request_id = EXCLUDED.request_id,
        custom_item_id = EXCLUDED.custom_item_id,
        updated_at = NOW();
    END LOOP;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update price history
CREATE TRIGGER trigger_update_price_history
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_price_history_from_order();

-- Function to get price history for a customer-provider pair
CREATE OR REPLACE FUNCTION get_customer_price_history(
  p_provider_id UUID,
  p_customer_id UUID,
  p_item_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  item_name_ar TEXT,
  item_name_en TEXT,
  unit_type TEXT,
  unit_price DECIMAL(10,2),
  last_ordered_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    coph.id,
    coph.item_name_ar,
    coph.item_name_en,
    coph.unit_type,
    coph.unit_price,
    coph.updated_at as last_ordered_at
  FROM custom_order_price_history coph
  WHERE coph.provider_id = p_provider_id
    AND coph.customer_id = p_customer_id
    AND (
      p_item_name IS NULL
      OR coph.item_name_normalized LIKE '%' || normalize_arabic(p_item_name) || '%'
    )
  ORDER BY coph.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE custom_order_price_history IS 'سجل الأسعار السابقة - لميزة "تم شراؤه مسبقاً" لمساعدة التاجر في التسعير';
COMMENT ON COLUMN custom_order_price_history.item_name_normalized IS 'الاسم المطبّع للمطابقة المرنة';
COMMENT ON COLUMN custom_order_price_history.unit_price IS 'آخر سعر للوحدة من هذا التاجر لهذا العميل';

-- ============================================================================
-- PART 6: ORDER TABLE UPDATES
-- ============================================================================

-- Add order flow type
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS order_flow TEXT DEFAULT 'standard' CHECK (order_flow IN ('standard', 'custom'));

-- Add broadcast reference
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS broadcast_id UUID REFERENCES custom_order_broadcasts(id) ON DELETE SET NULL;

-- Add pricing status
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS pricing_status TEXT CHECK (pricing_status IN (
  'awaiting_pricing',
  'pricing_sent',
  'pricing_approved',
  'pricing_rejected',
  'pricing_expired'
));

-- Add pricing timestamps
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS pricing_sent_at TIMESTAMPTZ;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS pricing_responded_at TIMESTAMPTZ;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS pricing_expires_at TIMESTAMPTZ;

-- ============================================================================
-- PART 7: ORDER ITEMS TABLE UPDATES
-- ============================================================================

-- Add item source
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS item_source TEXT DEFAULT 'menu' CHECK (item_source IN ('menu', 'custom'));

-- Add reference to custom item
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS custom_item_id UUID REFERENCES custom_order_items(id) ON DELETE SET NULL;

-- Add original customer text for traceability
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS original_customer_text TEXT;

-- ============================================================================
-- PART 8: RLS POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE custom_order_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_order_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_order_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BROADCASTS RLS
-- ============================================================================

-- Customers can view their own broadcasts
CREATE POLICY "customers_view_own_broadcasts"
ON custom_order_broadcasts FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

-- Customers can create broadcasts
CREATE POLICY "customers_create_broadcasts"
ON custom_order_broadcasts FOR INSERT
TO authenticated
WITH CHECK (customer_id = auth.uid());

-- Customers can update their own active broadcasts
CREATE POLICY "customers_update_own_broadcasts"
ON custom_order_broadcasts FOR UPDATE
TO authenticated
USING (customer_id = auth.uid() AND status = 'active')
WITH CHECK (customer_id = auth.uid());

-- Providers can view broadcasts sent to them
CREATE POLICY "providers_view_their_broadcasts"
ON custom_order_broadcasts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM providers p
    WHERE p.owner_id = auth.uid()
    AND p.id = ANY(custom_order_broadcasts.provider_ids)
  )
  OR EXISTS (
    SELECT 1 FROM provider_staff ps
    WHERE ps.user_id = auth.uid()
    AND ps.is_active = true
    AND ps.provider_id = ANY(custom_order_broadcasts.provider_ids)
  )
);

-- ============================================================================
-- REQUESTS RLS
-- ============================================================================

-- Customers can view requests for their broadcasts
CREATE POLICY "customers_view_own_requests"
ON custom_order_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM custom_order_broadcasts b
    WHERE b.id = custom_order_requests.broadcast_id
    AND b.customer_id = auth.uid()
  )
);

-- Providers can view requests sent to them
CREATE POLICY "providers_view_their_requests"
ON custom_order_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM providers p
    WHERE p.owner_id = auth.uid()
    AND p.id = custom_order_requests.provider_id
  )
  OR EXISTS (
    SELECT 1 FROM provider_staff ps
    WHERE ps.user_id = auth.uid()
    AND ps.is_active = true
    AND ps.provider_id = custom_order_requests.provider_id
  )
);

-- Providers can update their requests (for pricing)
CREATE POLICY "providers_update_their_requests"
ON custom_order_requests FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM providers p
    WHERE p.owner_id = auth.uid()
    AND p.id = custom_order_requests.provider_id
  )
  OR EXISTS (
    SELECT 1 FROM provider_staff ps
    WHERE ps.user_id = auth.uid()
    AND ps.is_active = true
    AND ps.can_manage_orders = true
    AND ps.provider_id = custom_order_requests.provider_id
  )
);

-- System can insert requests (via service role)
CREATE POLICY "system_insert_requests"
ON custom_order_requests FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================================================
-- ITEMS RLS
-- ============================================================================

-- Customers can view items for their requests
CREATE POLICY "customers_view_request_items"
ON custom_order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM custom_order_requests r
    JOIN custom_order_broadcasts b ON b.id = r.broadcast_id
    WHERE r.id = custom_order_items.request_id
    AND b.customer_id = auth.uid()
  )
);

-- Providers can view/manage items for their requests
CREATE POLICY "providers_view_their_items"
ON custom_order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM custom_order_requests r
    JOIN providers p ON p.id = r.provider_id
    WHERE r.id = custom_order_items.request_id
    AND p.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM custom_order_requests r
    JOIN provider_staff ps ON ps.provider_id = r.provider_id
    WHERE r.id = custom_order_items.request_id
    AND ps.user_id = auth.uid()
    AND ps.is_active = true
  )
);

CREATE POLICY "providers_insert_items"
ON custom_order_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM custom_order_requests r
    JOIN providers p ON p.id = r.provider_id
    WHERE r.id = custom_order_items.request_id
    AND p.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM custom_order_requests r
    JOIN provider_staff ps ON ps.provider_id = r.provider_id
    WHERE r.id = custom_order_items.request_id
    AND ps.user_id = auth.uid()
    AND ps.is_active = true
    AND ps.can_manage_orders = true
  )
);

CREATE POLICY "providers_update_items"
ON custom_order_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM custom_order_requests r
    JOIN providers p ON p.id = r.provider_id
    WHERE r.id = custom_order_items.request_id
    AND p.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM custom_order_requests r
    JOIN provider_staff ps ON ps.provider_id = r.provider_id
    WHERE r.id = custom_order_items.request_id
    AND ps.user_id = auth.uid()
    AND ps.is_active = true
    AND ps.can_manage_orders = true
  )
);

CREATE POLICY "providers_delete_items"
ON custom_order_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM custom_order_requests r
    JOIN providers p ON p.id = r.provider_id
    WHERE r.id = custom_order_items.request_id
    AND p.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM custom_order_requests r
    JOIN provider_staff ps ON ps.provider_id = r.provider_id
    WHERE r.id = custom_order_items.request_id
    AND ps.user_id = auth.uid()
    AND ps.is_active = true
    AND ps.can_manage_orders = true
  )
);

-- ============================================================================
-- PART 9: FUNCTIONS
-- ============================================================================

-- Function to handle winning order (First to Close wins)
CREATE OR REPLACE FUNCTION handle_custom_order_approval(
  p_order_id UUID,
  p_broadcast_id UUID
) RETURNS VOID AS $$
DECLARE
  v_broadcast RECORD;
BEGIN
  -- Lock the broadcast to prevent race conditions
  SELECT * INTO v_broadcast
  FROM custom_order_broadcasts
  WHERE id = p_broadcast_id
  FOR UPDATE;

  -- Check if broadcast is still active
  IF v_broadcast.status != 'active' THEN
    RAISE EXCEPTION 'Broadcast is no longer active';
  END IF;

  -- Mark broadcast as completed with winning order
  UPDATE custom_order_broadcasts
  SET
    status = 'completed',
    winning_order_id = p_order_id,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_broadcast_id;

  -- Mark winning order as confirmed
  UPDATE orders
  SET
    status = 'confirmed',
    pricing_status = 'pricing_approved',
    pricing_responded_at = NOW(),
    updated_at = NOW()
  WHERE id = p_order_id;

  -- Mark winning request as approved
  UPDATE custom_order_requests
  SET
    status = 'customer_approved',
    responded_at = NOW(),
    updated_at = NOW()
  WHERE order_id = p_order_id;

  -- Cancel all other orders in this broadcast
  UPDATE orders
  SET
    status = 'cancelled',
    pricing_status = 'pricing_rejected',
    cancellation_reason = 'تم اختيار تاجر آخر - Another merchant was selected',
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE broadcast_id = p_broadcast_id
  AND id != p_order_id
  AND status NOT IN ('cancelled', 'rejected');

  -- Cancel all other requests
  UPDATE custom_order_requests
  SET
    status = 'cancelled',
    updated_at = NOW()
  WHERE broadcast_id = p_broadcast_id
  AND order_id != p_order_id
  AND status NOT IN ('cancelled', 'customer_approved', 'customer_rejected');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to expire broadcasts
CREATE OR REPLACE FUNCTION expire_custom_order_broadcasts() RETURNS VOID AS $$
BEGIN
  -- Expire active broadcasts past their deadline
  UPDATE custom_order_broadcasts
  SET
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'active'
  AND expires_at < NOW();

  -- Expire pending requests
  UPDATE custom_order_requests
  SET
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'pending'
  AND EXISTS (
    SELECT 1 FROM custom_order_broadcasts b
    WHERE b.id = custom_order_requests.broadcast_id
    AND b.status = 'expired'
  );

  -- Cancel orders for expired broadcasts
  UPDATE orders
  SET
    status = 'cancelled',
    pricing_status = 'pricing_expired',
    cancellation_reason = 'انتهت مهلة التسعير - Pricing deadline expired',
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE order_flow = 'custom'
  AND pricing_status = 'awaiting_pricing'
  AND EXISTS (
    SELECT 1 FROM custom_order_broadcasts b
    WHERE b.id = orders.broadcast_id
    AND b.status = 'expired'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate custom order totals
CREATE OR REPLACE FUNCTION calculate_custom_order_totals(p_request_id UUID)
RETURNS TABLE (
  items_count INTEGER,
  subtotal DECIMAL(10,2),
  available_count INTEGER,
  unavailable_count INTEGER,
  substituted_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as items_count,
    COALESCE(SUM(
      CASE
        WHEN coi.availability_status = 'substituted' THEN coi.substitute_total_price
        WHEN coi.availability_status = 'available' THEN coi.total_price
        ELSE 0
      END
    ), 0)::DECIMAL(10,2) as subtotal,
    COUNT(*) FILTER (WHERE coi.availability_status = 'available')::INTEGER as available_count,
    COUNT(*) FILTER (WHERE coi.availability_status = 'unavailable')::INTEGER as unavailable_count,
    COUNT(*) FILTER (WHERE coi.availability_status = 'substituted')::INTEGER as substituted_count
  FROM custom_order_items coi
  WHERE coi.request_id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 10: TRIGGERS
-- ============================================================================

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_custom_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_broadcasts_timestamp
BEFORE UPDATE ON custom_order_broadcasts
FOR EACH ROW EXECUTE FUNCTION update_custom_order_timestamp();

CREATE TRIGGER update_requests_timestamp
BEFORE UPDATE ON custom_order_requests
FOR EACH ROW EXECUTE FUNCTION update_custom_order_timestamp();

CREATE TRIGGER update_items_timestamp
BEFORE UPDATE ON custom_order_items
FOR EACH ROW EXECUTE FUNCTION update_custom_order_timestamp();

-- ============================================================================
-- PART 11: COMMENTS
-- ============================================================================

COMMENT ON TABLE custom_order_broadcasts IS 'نظام البث الثلاثي - يرسل الطلب لـ 3 تجار ويفوز أول من يوافق عليه العميل';
COMMENT ON TABLE custom_order_requests IS 'طلبات التسعير المرسلة لكل تاجر';
COMMENT ON TABLE custom_order_items IS 'الأصناف المسعرة من التاجر مع مرونة التسمية';
COMMENT ON COLUMN custom_order_items.original_customer_text IS 'النص الأصلي من العميل - للرجوع إليه';
COMMENT ON COLUMN custom_order_items.item_name_ar IS 'اسم الصنف كما يحدده التاجر (قابل للتعديل لدقة الفاتورة)';

-- ============================================================================
-- PART 12: STORAGE BUCKET CONFIGURATION
-- ============================================================================

-- Create storage bucket for custom order files (voice, images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'custom-orders',
  'custom-orders',
  true,
  10485760,  -- 10MB max file size
  ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'image/jpeg', 'image/png', 'image/webp', 'application/json']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS Policy: Users can upload to their own broadcasts
DROP POLICY IF EXISTS "users_upload_to_own_broadcasts" ON storage.objects;
CREATE POLICY "users_upload_to_own_broadcasts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'custom-orders'
  AND (storage.foldername(name))[1] = 'broadcasts'
  AND EXISTS (
    SELECT 1 FROM custom_order_broadcasts b
    WHERE b.id::text = (storage.foldername(name))[2]
    AND b.customer_id = auth.uid()
  )
);

-- RLS Policy: Anyone can view public files
DROP POLICY IF EXISTS "public_read_custom_orders" ON storage.objects;
CREATE POLICY "public_read_custom_orders"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'custom-orders');

-- RLS Policy: Service role can delete files (for cleanup job)
DROP POLICY IF EXISTS "service_delete_custom_orders" ON storage.objects;
CREATE POLICY "service_delete_custom_orders"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'custom-orders');

-- ============================================================================
-- PART 13: SEED DATA (Optional)
-- ============================================================================

-- Update existing grocery/vegetables providers to custom mode
UPDATE providers
SET
  operation_mode = 'custom',
  custom_order_settings = '{
    "accepts_text": true,
    "accepts_voice": true,
    "accepts_image": true,
    "max_items_per_order": 50,
    "pricing_timeout_hours": 24,
    "customer_approval_timeout_hours": 2,
    "auto_cancel_after_hours": 48,
    "show_price_history": true
  }'::jsonb
WHERE category IN ('grocery', 'vegetables_fruits');

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
