import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createGiftEngine } from '@/lib/gifts';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { giftEntryId } = body;

    if (!giftEntryId) {
      return NextResponse.json({ error: 'giftEntryId required' }, { status: 400 });
    }

    const engine = createGiftEngine(supabase);
    const success = await engine.openGift(giftEntryId);

    if (!success) {
      return NextResponse.json({ error: 'Gift not found or already opened' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to open gift' }, { status: 500 });
  }
}
