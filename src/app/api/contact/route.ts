import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

/**
 * Contact Form API Endpoint
 *
 * POST /api/contact
 *
 * Creates a support ticket from the contact form.
 * This endpoint is public and doesn't require authentication.
 */

// Validation schema
const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
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

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = contactFormSchema.parse(body);

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
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        // No user_id since this is anonymous contact form
        type: inquiryTypeMap[validatedData.inquiryType],
        source: 'contact_form',
        priority: priorityMap[validatedData.inquiryType],
        status: 'open',
        subject: subject,
        description: validatedData.message,
        // New contact form fields
        contact_name: validatedData.name,
        contact_email: validatedData.email,
      })
      .select('id, ticket_number')
      .single();

    if (error) {
      console.error('Error creating contact ticket:', error);
      return NextResponse.json(
        { error: 'Failed to submit contact form', details: error.message },
        { status: 500 }
      );
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
      console.error('Error creating admin notification:', notifError);
    }

    return NextResponse.json({
      success: true,
      message: 'Contact form submitted successfully',
      ticketNumber: ticket.ticket_number,
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Contact form error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
