import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminGiftsService } from '@/lib/admin-gifts';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const service = createAdminGiftsService(supabase);
    const overview = await service.getOverview();
    return NextResponse.json({ overview });
  } catch (error) {
    console.error('[/api/admin/gifts/overview]', error);
    return NextResponse.json({ error: 'Failed to load overview' }, { status: 500 });
  }
}
