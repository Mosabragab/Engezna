import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createGiftEngine } from '@/lib/gifts';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const engine = createGiftEngine(supabase);
    const gifts = await engine.getUserGiftBox(user.id);
    const stampCard = await engine.getUserStampCard(user.id);

    return NextResponse.json({ gifts, stampCard });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load gift box' }, { status: 500 });
  }
}
