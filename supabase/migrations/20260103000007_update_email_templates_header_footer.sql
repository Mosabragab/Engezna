-- ============================================================================
-- Update Email Templates Header and Footer
-- Adds tagline to header and complete footer with all links
-- ============================================================================

-- Define the new standard footer
DO $$
DECLARE
    new_footer TEXT := E'<tr>
                    <td align="center" style="background-color: #0F172A; padding: 28px 24px;">
                        <a href="https://www.engezna.com" style="text-decoration: none;">
                            <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا" width="100" style="height: auto; display: block; margin: 0 auto;">
                        </a>
                        <p style="color: #009DE0; font-size: 13px; font-weight: 500; margin: 14px 0;">منصة لتلبية احتياجات البيت اليومية لجمهورية مصر العربية</p>
                        <p style="font-size: 12px; color: #64748B; margin: 10px 0;">لكل محافظات مصر 🇪🇬</p>
                        <p style="font-size: 11px; color: #475569; margin: 14px 0 0 0;">صنع بـ 💚 في مصر</p>
                        <p style="font-size: 11px; color: #64748B; margin: 14px 0 0 0;">
                            <a href="https://www.engezna.com/ar/privacy" style="color: #009DE0; text-decoration: none; margin: 0 6px;">سياسة الخصوصية</a> •
                            <a href="https://www.engezna.com/ar/terms" style="color: #009DE0; text-decoration: none; margin: 0 6px;">الشروط والأحكام</a> •
                            <a href="https://www.engezna.com/ar/help" style="color: #009DE0; text-decoration: none; margin: 0 6px;">الدعم الفني</a>
                        </p>
                    </td>
                </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>';

    new_header_tagline TEXT := E'<p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">عايز تطلب؟ إنجزنا!</p>';

    template_record RECORD;
    updated_content TEXT;
    footer_start_pos INTEGER;
    header_logo_end_pos INTEGER;
BEGIN
    -- Loop through all active templates
    FOR template_record IN SELECT id, slug, html_content FROM email_templates WHERE is_active = true
    LOOP
        updated_content := template_record.html_content;

        -- 1. Update Footer: Find the footer section (starts with background-color: #0F172A)
        footer_start_pos := position('<td align="center" style="background-color: #0F172A' in updated_content);

        IF footer_start_pos > 0 THEN
            -- Find the <tr> before it
            footer_start_pos := footer_start_pos - 50; -- Go back to find the <tr>

            -- Find the actual <tr> start
            WHILE footer_start_pos > 1 AND substring(updated_content from footer_start_pos for 3) != '<tr' LOOP
                footer_start_pos := footer_start_pos - 1;
            END LOOP;

            IF footer_start_pos > 1 THEN
                -- Keep content before footer and add new footer
                updated_content := substring(updated_content from 1 for footer_start_pos - 1) || new_footer;
            END IF;
        END IF;

        -- 2. Update Header: Add tagline after logo if not already present
        IF position('عايز تطلب؟ إنجزنا!' in updated_content) = 0 THEN
            -- Find the logo closing tag in header
            header_logo_end_pos := position('alt="إنجزنا | Engezna" width="140"' in updated_content);

            IF header_logo_end_pos > 0 THEN
                -- Find the </a> after the logo
                header_logo_end_pos := position('</a>' in substring(updated_content from header_logo_end_pos)) + header_logo_end_pos + 3;

                -- Insert the tagline after </a>
                updated_content := substring(updated_content from 1 for header_logo_end_pos) ||
                                   E'\n                        ' || new_header_tagline ||
                                   substring(updated_content from header_logo_end_pos + 1);
            END IF;
        END IF;

        -- Update the template
        UPDATE email_templates
        SET html_content = updated_content,
            updated_at = NOW()
        WHERE id = template_record.id;

        RAISE NOTICE 'Updated template: %', template_record.slug;
    END LOOP;
END $$;

-- Verify the updates
SELECT slug, name,
       CASE WHEN html_content LIKE '%عايز تطلب؟ إنجزنا!%' THEN 'YES' ELSE 'NO' END as has_tagline,
       CASE WHEN html_content LIKE '%لكل محافظات مصر%' THEN 'YES' ELSE 'NO' END as has_egypt_line,
       CASE WHEN html_content LIKE '%صنع بـ 💚 في مصر%' THEN 'YES' ELSE 'NO' END as has_made_in_egypt
FROM email_templates
WHERE is_active = true
ORDER BY category, slug;
