import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { withValidation } from '@/lib/api/validate';
import { successResponse } from '@/lib/api/error-handler';

/**
 * Contact Form API Endpoint
 *
 * POST /api/contact
 *
 * Creates a support ticket from the contact form.
 * This endpoint is public and doesn't require authentication.
 */

// Generate unique ticket number
function generateTicketNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${timestamp}-${random}`;
}

// Validation schema
const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(20).optional(),
  inquiryType: z.enum(['general', 'complaint', 'suggestion', 'partnership']),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000),
});

// Map inquiry types to ticket types
const inquiryTypeMap: Record<string, string> = {
  general: 'other',
  complaint: 'quality',
  suggestion: 'other',
  partnership: 'other',
};

// Map inquiry types to priorities
const priorityMap: Record<string, string> = {
  general: 'low',
  complaint: 'medium',
  suggestion: 'low',
  partnership: 'medium',
};

export const POST = withValidation(
  { body: contactFormSchema },
  async (_request: NextRequest, { body: validatedData }) => {
    // Use admin client to bypass RLS (since user is not authenticated)
    const supabase = createAdminClient();

    // Create subject based on inquiry type
    const subjectPrefixes: Record<string, string> = {
      general: '[استفسار عام]',
      complaint: '[شكوى]',
      suggestion: '[اقتراح]',
      partnership: '[طلب شراكة]',
    };

    const subject = `${subjectPrefixes[validatedData.inquiryType]} ${validatedData.name}`;

    // Create the support ticket
    const ticketNumber = generateTicketNumber();
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        ticket_number: ticketNumber,
        type: inquiryTypeMap[validatedData.inquiryType],
        source: 'contact_form',
        priority: priorityMap[validatedData.inquiryType],
        status: 'open',
        subject: subject,
        description: validatedData.message,
        contact_name: validatedData.name,
        contact_email: validatedData.email,
        contact_phone: validatedData.phone || null,
      })
      .select('id, ticket_number')
      .single();

    if (error) {
      logger.error('Error creating contact ticket', { error });
      throw new Error('Failed to submit contact form');
    }

    // Create admin notification for new contact form submission
    try {
      await supabase.from('admin_notifications').insert({
        type: 'support_ticket',
        title: 'رسالة جديدة من صفحة التواصل',
        message: `رسالة من: ${validatedData.name} (${validatedData.email}) - ${validatedData.inquiryType}`,
        related_ticket_id: ticket.id,
        is_read: false,
      });
    } catch (notifError) {
      // Don't fail the request if notification fails
      logger.error('Error creating admin notification', { error: notifError });
    }

    return successResponse({
      success: true,
      message: 'Contact form submitted successfully',
      ticketNumber: ticket.ticket_number,
    });
  }
);
