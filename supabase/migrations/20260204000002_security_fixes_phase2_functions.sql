-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ Security Fixes Phase 2 - Function Search Path                                 ║
-- ║ إصلاحات الأمان المرحلة الثانية - مسار البحث للدوال                             ║
-- ║                                                                                ║
-- ║ SAFE MIGRATION - Only adds search_path, no logic changes                      ║
-- ║ فقط يضيف search_path، بدون تغيير المنطق                                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════════════════
-- PART 1: Critical Financial Functions (High Priority)
-- الدوال المالية الحساسة (أولوية عالية)
-- ════════════════════════════════════════════════════════════════════════════════

-- 1.1 get_provider_commission
ALTER FUNCTION IF EXISTS public.get_provider_commission(uuid) SET search_path = public;

-- 1.2 calculate_order_commission
ALTER FUNCTION IF EXISTS public.calculate_order_commission(uuid) SET search_path = public;

-- 1.3 generate_provider_settlement
ALTER FUNCTION IF EXISTS public.generate_provider_settlement(uuid, date, date) SET search_path = public;

-- 1.4 recalculate_settlement
ALTER FUNCTION IF EXISTS public.recalculate_settlement(uuid) SET search_path = public;

-- 1.5 update_settlement_after_refund
ALTER FUNCTION IF EXISTS public.update_settlement_after_refund() SET search_path = public;

-- 1.6 handle_refund_settlement_update
ALTER FUNCTION IF EXISTS public.handle_refund_settlement_update() SET search_path = public;

-- 1.7 log_settlement_changes
ALTER FUNCTION IF EXISTS public.log_settlement_changes() SET search_path = public;

-- 1.8 log_commission_settings_change
ALTER FUNCTION IF EXISTS public.log_commission_settings_change() SET search_path = public;

-- 1.9 calculate_custom_order_totals
ALTER FUNCTION IF EXISTS public.calculate_custom_order_totals(uuid) SET search_path = public;

-- 1.10 calculate_item_price
ALTER FUNCTION IF EXISTS public.calculate_item_price(uuid, integer, jsonb) SET search_path = public;

-- 1.11 calculate_banner_end_date
ALTER FUNCTION IF EXISTS public.calculate_banner_end_date(text, timestamp with time zone) SET search_path = public;

-- 1.12 get_provider_financial_data
ALTER FUNCTION IF EXISTS public.get_provider_financial_data(uuid) SET search_path = public;

-- 1.13 simulate_pricing_for_request
ALTER FUNCTION IF EXISTS public.simulate_pricing_for_request(uuid) SET search_path = public;


-- ════════════════════════════════════════════════════════════════════════════════
-- PART 2: Authentication & Permission Functions (High Priority)
-- دوال المصادقة والصلاحيات (أولوية عالية)
-- ════════════════════════════════════════════════════════════════════════════════

-- 2.1 is_admin
ALTER FUNCTION IF EXISTS public.is_admin() SET search_path = public;

-- 2.2 is_super_admin
ALTER FUNCTION IF EXISTS public.is_super_admin() SET search_path = public;

-- 2.3 is_provider_owner
ALTER FUNCTION IF EXISTS public.is_provider_owner(uuid) SET search_path = public;

-- 2.4 is_provider_staff
ALTER FUNCTION IF EXISTS public.is_provider_staff(uuid) SET search_path = public;

-- 2.5 user_owns_provider
ALTER FUNCTION IF EXISTS public.user_owns_provider(uuid) SET search_path = public;

-- 2.6 can_access_provider
ALTER FUNCTION IF EXISTS public.can_access_provider(uuid) SET search_path = public;

-- 2.7 can_manage_provider_menu
ALTER FUNCTION IF EXISTS public.can_manage_provider_menu(uuid) SET search_path = public;

-- 2.8 can_manage_provider_orders
ALTER FUNCTION IF EXISTS public.can_manage_provider_orders(uuid) SET search_path = public;

-- 2.9 can_review_order
ALTER FUNCTION IF EXISTS public.can_review_order(uuid) SET search_path = public;

-- 2.10 assign_permission_to_role
ALTER FUNCTION IF EXISTS public.assign_permission_to_role(uuid, uuid) SET search_path = public;

-- 2.11 log_permission_change
ALTER FUNCTION IF EXISTS public.log_permission_change() SET search_path = public;

-- 2.12 accept_admin_invitation
ALTER FUNCTION IF EXISTS public.accept_admin_invitation(text) SET search_path = public;

-- 2.13 register_admin_from_invitation
ALTER FUNCTION IF EXISTS public.register_admin_from_invitation(text, text, text, text) SET search_path = public;

-- 2.14 accept_provider_invitation
ALTER FUNCTION IF EXISTS public.accept_provider_invitation(text) SET search_path = public;

-- 2.15 create_provider_invitation
ALTER FUNCTION IF EXISTS public.create_provider_invitation(uuid, text, text, text) SET search_path = public;

-- 2.16 sync_admin_users_to_roles
ALTER FUNCTION IF EXISTS public.sync_admin_users_to_roles() SET search_path = public;

-- 2.17 deactivate_staff_member
ALTER FUNCTION IF EXISTS public.deactivate_staff_member(uuid, uuid) SET search_path = public;

-- 2.18 check_provider_staff_limit
ALTER FUNCTION IF EXISTS public.check_provider_staff_limit() SET search_path = public;


-- ════════════════════════════════════════════════════════════════════════════════
-- PART 3: Refund Functions (High Priority)
-- دوال المرتجعات (أولوية عالية)
-- ════════════════════════════════════════════════════════════════════════════════

-- 3.1 create_customer_refund_request
ALTER FUNCTION IF EXISTS public.create_customer_refund_request(uuid, text, numeric, text, text[]) SET search_path = public;

-- 3.2 provider_respond_to_refund
ALTER FUNCTION IF EXISTS public.provider_respond_to_refund(uuid, text, text) SET search_path = public;

-- 3.3 customer_confirm_refund
ALTER FUNCTION IF EXISTS public.customer_confirm_refund(uuid, boolean, text) SET search_path = public;

-- 3.4 auto_confirm_expired_refunds
ALTER FUNCTION IF EXISTS public.auto_confirm_expired_refunds() SET search_path = public;

-- 3.5 hold_order_on_refund_request
ALTER FUNCTION IF EXISTS public.hold_order_on_refund_request() SET search_path = public;

-- 3.6 release_order_on_refund_resolution
ALTER FUNCTION IF EXISTS public.release_order_on_refund_resolution() SET search_path = public;

-- 3.7 notify_refund_status_change
ALTER FUNCTION IF EXISTS public.notify_refund_status_change() SET search_path = public;

-- 3.8 debug_refund_access
ALTER FUNCTION IF EXISTS public.debug_refund_access(uuid) SET search_path = public;


-- ════════════════════════════════════════════════════════════════════════════════
-- PART 4: Notification Functions (Medium Priority)
-- دوال الإشعارات (أولوية متوسطة)
-- ════════════════════════════════════════════════════════════════════════════════

-- 4.1 notify_provider_new_order
ALTER FUNCTION IF EXISTS public.notify_provider_new_order() SET search_path = public;

-- 4.2 notify_customer_order_status
ALTER FUNCTION IF EXISTS public.notify_customer_order_status() SET search_path = public;

-- 4.3 notify_admin_new_order
ALTER FUNCTION IF EXISTS public.notify_admin_new_order() SET search_path = public;

-- 4.4 notify_admin_new_refund
ALTER FUNCTION IF EXISTS public.notify_admin_new_refund() SET search_path = public;

-- 4.5 notify_provider_new_refund
ALTER FUNCTION IF EXISTS public.notify_provider_new_refund() SET search_path = public;

-- 4.6 notify_admin_new_provider
ALTER FUNCTION IF EXISTS public.notify_admin_new_provider() SET search_path = public;

-- 4.7 notify_admin_new_support_ticket
ALTER FUNCTION IF EXISTS public.notify_admin_new_support_ticket() SET search_path = public;

-- 4.8 notify_admin_task_assigned
ALTER FUNCTION IF EXISTS public.notify_admin_task_assigned() SET search_path = public;

-- 4.9 notify_admin_internal_message
ALTER FUNCTION IF EXISTS public.notify_admin_internal_message() SET search_path = public;

-- 4.10 notify_admin_order_cancelled
ALTER FUNCTION IF EXISTS public.notify_admin_order_cancelled() SET search_path = public;

-- 4.11 notify_admin_approval_request
ALTER FUNCTION IF EXISTS public.notify_admin_approval_request() SET search_path = public;

-- 4.12 notify_provider_new_review
ALTER FUNCTION IF EXISTS public.notify_provider_new_review() SET search_path = public;

-- 4.13 notify_provider_new_message
ALTER FUNCTION IF EXISTS public.notify_provider_new_message() SET search_path = public;

-- 4.14 notify_provider_banner_status
ALTER FUNCTION IF EXISTS public.notify_provider_banner_status() SET search_path = public;

-- 4.15 call_notification_webhook
ALTER FUNCTION IF EXISTS public.call_notification_webhook(text, jsonb) SET search_path = public;

-- 4.16 trigger_new_order_notification
ALTER FUNCTION IF EXISTS public.trigger_new_order_notification() SET search_path = public;

-- 4.17 trigger_order_status_notification
ALTER FUNCTION IF EXISTS public.trigger_order_status_notification() SET search_path = public;

-- 4.18 trigger_new_message_notification
ALTER FUNCTION IF EXISTS public.trigger_new_message_notification() SET search_path = public;

-- 4.19 trigger_new_review_notification
ALTER FUNCTION IF EXISTS public.trigger_new_review_notification() SET search_path = public;

-- 4.20 create_regional_admin_notification
ALTER FUNCTION IF EXISTS public.create_regional_admin_notification(uuid, text, text, text, jsonb) SET search_path = public;


-- ════════════════════════════════════════════════════════════════════════════════
-- PART 5: Custom Order Functions (Medium Priority)
-- دوال الطلبات المخصصة (أولوية متوسطة)
-- ════════════════════════════════════════════════════════════════════════════════

-- 5.1 customer_approve_custom_order
ALTER FUNCTION IF EXISTS public.customer_approve_custom_order(uuid) SET search_path = public;

-- 5.2 customer_reject_custom_order
ALTER FUNCTION IF EXISTS public.customer_reject_custom_order(uuid, text) SET search_path = public;

-- 5.3 handle_custom_order_approval
ALTER FUNCTION IF EXISTS public.handle_custom_order_approval() SET search_path = public;

-- 5.4 notify_custom_order_approved
ALTER FUNCTION IF EXISTS public.notify_custom_order_approved() SET search_path = public;

-- 5.5 notify_custom_order_rejected
ALTER FUNCTION IF EXISTS public.notify_custom_order_rejected() SET search_path = public;

-- 5.6 notify_custom_order_priced
ALTER FUNCTION IF EXISTS public.notify_custom_order_priced() SET search_path = public;

-- 5.7 notify_new_custom_order_request
ALTER FUNCTION IF EXISTS public.notify_new_custom_order_request() SET search_path = public;

-- 5.8 expire_custom_order_requests
ALTER FUNCTION IF EXISTS public.expire_custom_order_requests() SET search_path = public;

-- 5.9 expire_priced_custom_orders
ALTER FUNCTION IF EXISTS public.expire_priced_custom_orders() SET search_path = public;

-- 5.10 expire_custom_order_broadcasts
ALTER FUNCTION IF EXISTS public.expire_custom_order_broadcasts() SET search_path = public;

-- 5.11 admin_expire_custom_orders
ALTER FUNCTION IF EXISTS public.admin_expire_custom_orders() SET search_path = public;

-- 5.12 enable_custom_orders_for_provider
ALTER FUNCTION IF EXISTS public.enable_custom_orders_for_provider(uuid, jsonb) SET search_path = public;

-- 5.13 update_custom_order_timestamp
ALTER FUNCTION IF EXISTS public.update_custom_order_timestamp() SET search_path = public;

-- 5.14 trigger_cleanup_custom_order_files
ALTER FUNCTION IF EXISTS public.trigger_cleanup_custom_order_files() SET search_path = public;

-- 5.15 mark_broadcasts_for_cleanup
ALTER FUNCTION IF EXISTS public.mark_broadcasts_for_cleanup() SET search_path = public;

-- 5.16 clear_broadcast_file_urls
ALTER FUNCTION IF EXISTS public.clear_broadcast_file_urls() SET search_path = public;


-- ════════════════════════════════════════════════════════════════════════════════
-- PART 6: Order & Business Functions (Medium Priority)
-- دوال الطلبات والأعمال (أولوية متوسطة)
-- ════════════════════════════════════════════════════════════════════════════════

-- 6.1 generate_order_number
ALTER FUNCTION IF EXISTS public.generate_order_number() SET search_path = public;

-- 6.2 set_order_number
ALTER FUNCTION IF EXISTS public.set_order_number() SET search_path = public;

-- 6.3 generate_ticket_number
ALTER FUNCTION IF EXISTS public.generate_ticket_number() SET search_path = public;

-- 6.4 generate_task_number
ALTER FUNCTION IF EXISTS public.generate_task_number() SET search_path = public;

-- 6.5 generate_referral_code
ALTER FUNCTION IF EXISTS public.generate_referral_code() SET search_path = public;

-- 6.6 validate_scheduled_time
ALTER FUNCTION IF EXISTS public.validate_scheduled_time() SET search_path = public;

-- 6.7 check_delayed_orders_and_notify
ALTER FUNCTION IF EXISTS public.check_delayed_orders_and_notify() SET search_path = public;

-- 6.8 check_escalation_rules
ALTER FUNCTION IF EXISTS public.check_escalation_rules() SET search_path = public;

-- 6.9 update_provider_rating
ALTER FUNCTION IF EXISTS public.update_provider_rating() SET search_path = public;

-- 6.10 update_price_history_from_order
ALTER FUNCTION IF EXISTS public.update_price_history_from_order() SET search_path = public;

-- 6.11 get_customer_price_history
ALTER FUNCTION IF EXISTS public.get_customer_price_history(uuid, integer) SET search_path = public;


-- ════════════════════════════════════════════════════════════════════════════════
-- PART 7: Search Functions (Medium Priority)
-- دوال البحث (أولوية متوسطة)
-- ════════════════════════════════════════════════════════════════════════════════

-- 7.1 simple_search_menu
ALTER FUNCTION IF EXISTS public.simple_search_menu(text, uuid) SET search_path = public;

-- 7.2 fuzzy_search_menu_items
ALTER FUNCTION IF EXISTS public.fuzzy_search_menu_items(text, integer) SET search_path = public;

-- 7.3 hybrid_search_menu (multiple overloads may exist)
DO $$
BEGIN
  ALTER FUNCTION public.hybrid_search_menu(text, uuid, integer) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.hybrid_search_menu(vector, integer) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- 7.4 match_menu_items
ALTER FUNCTION IF EXISTS public.match_menu_items(vector, integer, uuid) SET search_path = public;

-- 7.5 find_nearby_providers
ALTER FUNCTION IF EXISTS public.find_nearby_providers(double precision, double precision, integer) SET search_path = public;

-- 7.6 expand_query_with_synonyms
ALTER FUNCTION IF EXISTS public.expand_query_with_synonyms(text) SET search_path = public;

-- 7.7 normalize_arabic
ALTER FUNCTION IF EXISTS public.normalize_arabic(text) SET search_path = public;

-- 7.8 transliterate_franco_arab
ALTER FUNCTION IF EXISTS public.transliterate_franco_arab(text) SET search_path = public;

-- 7.9 is_franco_arab
ALTER FUNCTION IF EXISTS public.is_franco_arab(text) SET search_path = public;


-- ════════════════════════════════════════════════════════════════════════════════
-- PART 8: Utility Functions (Lower Priority)
-- دوال مساعدة (أولوية أقل)
-- ════════════════════════════════════════════════════════════════════════════════

-- 8.1 handle_updated_at
ALTER FUNCTION IF EXISTS public.handle_updated_at() SET search_path = public;

-- 8.2 update_updated_at_column
ALTER FUNCTION IF EXISTS public.update_updated_at_column() SET search_path = public;

-- 8.3 update_app_settings_timestamp
ALTER FUNCTION IF EXISTS public.update_app_settings_timestamp() SET search_path = public;

-- 8.4 update_email_template_timestamp
ALTER FUNCTION IF EXISTS public.update_email_template_timestamp() SET search_path = public;

-- 8.5 update_homepage_banners_updated_at
ALTER FUNCTION IF EXISTS public.update_homepage_banners_updated_at() SET search_path = public;

-- 8.6 log_app_settings_change
ALTER FUNCTION IF EXISTS public.log_app_settings_change() SET search_path = public;

-- 8.7 log_cleanup_result
ALTER FUNCTION IF EXISTS public.log_cleanup_result(text, integer, integer) SET search_path = public;

-- 8.8 array_distinct
ALTER FUNCTION IF EXISTS public.array_distinct(anyarray) SET search_path = public;

-- 8.9 prevent_locked_fields_change
ALTER FUNCTION IF EXISTS public.prevent_locked_fields_change() SET search_path = public;

-- 8.10 prevent_category_change
ALTER FUNCTION IF EXISTS public.prevent_category_change() SET search_path = public;


-- ════════════════════════════════════════════════════════════════════════════════
-- PART 9: Settings & Configuration Functions
-- دوال الإعدادات والتكوين
-- ════════════════════════════════════════════════════════════════════════════════

-- 9.1 get_app_setting
ALTER FUNCTION IF EXISTS public.get_app_setting(text) SET search_path = public;

-- 9.2 update_app_setting
ALTER FUNCTION IF EXISTS public.update_app_setting(text, jsonb) SET search_path = public;

-- 9.3 get_settings_by_category
ALTER FUNCTION IF EXISTS public.get_settings_by_category(text) SET search_path = public;

-- 9.4 get_setting_changelog
ALTER FUNCTION IF EXISTS public.get_setting_changelog(text, integer) SET search_path = public;


-- ════════════════════════════════════════════════════════════════════════════════
-- PART 10: FCM & Token Functions
-- دوال FCM والتوكنات
-- ════════════════════════════════════════════════════════════════════════════════

-- 10.1 upsert_fcm_token
ALTER FUNCTION IF EXISTS public.upsert_fcm_token(text, text, text) SET search_path = public;

-- 10.2 mark_fcm_token_invalid
ALTER FUNCTION IF EXISTS public.mark_fcm_token_invalid(text) SET search_path = public;

-- 10.3 cleanup_invalid_fcm_tokens
ALTER FUNCTION IF EXISTS public.cleanup_invalid_fcm_tokens() SET search_path = public;

-- 10.4 get_user_fcm_tokens
ALTER FUNCTION IF EXISTS public.get_user_fcm_tokens(uuid) SET search_path = public;

-- 10.5 get_provider_staff_tokens
ALTER FUNCTION IF EXISTS public.get_provider_staff_tokens(uuid) SET search_path = public;

-- 10.6 get_admins_for_governorate
ALTER FUNCTION IF EXISTS public.get_admins_for_governorate(uuid) SET search_path = public;


-- ════════════════════════════════════════════════════════════════════════════════
-- PART 11: Homepage & SDUI Functions
-- دوال الصفحة الرئيسية وSDUI
-- ════════════════════════════════════════════════════════════════════════════════

-- 11.1 get_homepage_sections
ALTER FUNCTION IF EXISTS public.get_homepage_sections() SET search_path = public;

-- 11.2 get_page_sections
ALTER FUNCTION IF EXISTS public.get_page_sections(text, text, uuid, uuid, text) SET search_path = public;

-- 11.3 reorder_homepage_sections
ALTER FUNCTION IF EXISTS public.reorder_homepage_sections(jsonb) SET search_path = public;

-- 11.4 reorder_page_sections
ALTER FUNCTION IF EXISTS public.reorder_page_sections(text, jsonb) SET search_path = public;

-- 11.5 save_homepage_layout_version
ALTER FUNCTION IF EXISTS public.save_homepage_layout_version(text, text, jsonb) SET search_path = public;

-- 11.6 get_section_analytics
ALTER FUNCTION IF EXISTS public.get_section_analytics(uuid, date, date) SET search_path = public;

-- 11.7 get_section_daily_analytics
ALTER FUNCTION IF EXISTS public.get_section_daily_analytics(uuid, date, date) SET search_path = public;

-- 11.8 track_section_event
ALTER FUNCTION IF EXISTS public.track_section_event(uuid, text, uuid, jsonb) SET search_path = public;


-- ════════════════════════════════════════════════════════════════════════════════
-- PART 12: A/B Testing Functions
-- دوال اختبارات A/B
-- ════════════════════════════════════════════════════════════════════════════════

-- 12.1 get_ab_test_variant
ALTER FUNCTION IF EXISTS public.get_ab_test_variant(uuid, text) SET search_path = public;

-- 12.2 track_ab_test_view
ALTER FUNCTION IF EXISTS public.track_ab_test_view(uuid, text) SET search_path = public;

-- 12.3 track_ab_test_conversion
ALTER FUNCTION IF EXISTS public.track_ab_test_conversion(uuid, text, text) SET search_path = public;

-- 12.4 get_ab_test_results
ALTER FUNCTION IF EXISTS public.get_ab_test_results(uuid) SET search_path = public;

-- 12.5 get_active_ab_tests
ALTER FUNCTION IF EXISTS public.get_active_ab_tests() SET search_path = public;


-- ════════════════════════════════════════════════════════════════════════════════
-- PART 13: Banner Functions
-- دوال البانرات
-- ════════════════════════════════════════════════════════════════════════════════

-- 13.1 get_banners_for_location (multiple overloads may exist)
DO $$
BEGIN
  ALTER FUNCTION public.get_banners_for_location(uuid, uuid) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.get_banners_for_location(uuid, uuid, boolean) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- 13.2 can_provider_create_banner
ALTER FUNCTION IF EXISTS public.can_provider_create_banner(uuid) SET search_path = public;

-- 13.3 get_provider_banner_status
ALTER FUNCTION IF EXISTS public.get_provider_banner_status(uuid) SET search_path = public;

-- 13.4 get_provider_banner_history
ALTER FUNCTION IF EXISTS public.get_provider_banner_history(uuid) SET search_path = public;

-- 13.5 get_pending_banners_for_approval
ALTER FUNCTION IF EXISTS public.get_pending_banners_for_approval() SET search_path = public;

-- 13.6 get_all_provider_banners_for_admin
ALTER FUNCTION IF EXISTS public.get_all_provider_banners_for_admin() SET search_path = public;


-- ════════════════════════════════════════════════════════════════════════════════
-- PART 14: Menu & Product Functions
-- دوال القوائم والمنتجات
-- ════════════════════════════════════════════════════════════════════════════════

-- 14.1 get_store_menu
ALTER FUNCTION IF EXISTS public.get_store_menu(uuid) SET search_path = public;

-- 14.2 get_menu_items_with_pricing
ALTER FUNCTION IF EXISTS public.get_menu_items_with_pricing(uuid) SET search_path = public;

-- 14.3 get_provider_products_with_variants
ALTER FUNCTION IF EXISTS public.get_provider_products_with_variants(uuid) SET search_path = public;


-- ════════════════════════════════════════════════════════════════════════════════
-- PART 15: Embedding Functions
-- دوال التضمينات (Embeddings)
-- ════════════════════════════════════════════════════════════════════════════════

-- 15.1 process_missing_embeddings
ALTER FUNCTION IF EXISTS public.process_missing_embeddings(integer) SET search_path = public;

-- 15.2 regenerate_embedding
ALTER FUNCTION IF EXISTS public.regenerate_embedding(uuid) SET search_path = public;

-- 15.3 queue_embedding_on_update
ALTER FUNCTION IF EXISTS public.queue_embedding_on_update() SET search_path = public;

-- 15.4 notify_embedding_generation
ALTER FUNCTION IF EXISTS public.notify_embedding_generation() SET search_path = public;

-- 15.5 get_embedding_stats
ALTER FUNCTION IF EXISTS public.get_embedding_stats() SET search_path = public;


-- ════════════════════════════════════════════════════════════════════════════════
-- PART 16: Miscellaneous Functions
-- دوال متنوعة
-- ════════════════════════════════════════════════════════════════════════════════

-- 16.1 toggle_favorite_provider
ALTER FUNCTION IF EXISTS public.toggle_favorite_provider(uuid) SET search_path = public;

-- 16.2 upsert_user_insights
ALTER FUNCTION IF EXISTS public.upsert_user_insights(uuid, jsonb) SET search_path = public;

-- 16.3 create_default_notification_preferences
ALTER FUNCTION IF EXISTS public.create_default_notification_preferences() SET search_path = public;

-- 16.4 cleanup_expired_drafts
ALTER FUNCTION IF EXISTS public.cleanup_expired_drafts() SET search_path = public;

-- 16.5 calculate_distance_km
ALTER FUNCTION IF EXISTS public.calculate_distance_km(double precision, double precision, double precision, double precision) SET search_path = public;

-- 16.6 get_duration_priority
ALTER FUNCTION IF EXISTS public.get_duration_priority(text) SET search_path = public;

-- 16.7 assign_default_settlement_group
ALTER FUNCTION IF EXISTS public.assign_default_settlement_group() SET search_path = public;

-- 16.8 create_test_custom_order_broadcast
ALTER FUNCTION IF EXISTS public.create_test_custom_order_broadcast(uuid) SET search_path = public;


-- ════════════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ════════════════════════════════════════════════════════════════════════════════
--
-- To verify the changes, run:
-- SELECT proname, proconfig
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
-- AND proconfig IS NOT NULL
-- AND 'search_path=public' = ANY(proconfig);
--
-- للتحقق من التغييرات، شغّل الاستعلام أعلاه
-- ════════════════════════════════════════════════════════════════════════════════
