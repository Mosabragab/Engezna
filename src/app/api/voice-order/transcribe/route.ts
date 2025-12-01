import { NextRequest, NextResponse } from 'next/server'

// Deepgram API configuration
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY
const DEEPGRAM_API_URL = 'https://api.deepgram.com/v1/listen'

export async function POST(request: NextRequest) {
  try {
    if (!DEEPGRAM_API_KEY) {
      console.error('DEEPGRAM_API_KEY is not configured')
      return NextResponse.json(
        { error: 'Speech recognition service is not configured' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const locale = formData.get('locale') as string || 'ar'

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Convert audio file to buffer
    const audioBuffer = await audioFile.arrayBuffer()

    // Determine the language for transcription
    // Arabic is the primary language, with English as fallback
    const language = locale === 'ar' ? 'ar' : 'en'

    // Call Deepgram API
    const deepgramResponse = await fetch(
      `${DEEPGRAM_API_URL}?language=${language}&model=nova-2&smart_format=true&punctuate=true`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'audio/webm',
        },
        body: audioBuffer,
      }
    )

    if (!deepgramResponse.ok) {
      const errorText = await deepgramResponse.text()
      console.error('Deepgram API error:', errorText)
      return NextResponse.json(
        { error: 'Speech recognition failed' },
        { status: 500 }
      )
    }

    const deepgramData = await deepgramResponse.json()

    // Extract transcript from Deepgram response
    const transcript = deepgramData.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
    const confidence = deepgramData.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0

    if (!transcript) {
      return NextResponse.json({
        transcript: '',
        message: locale === 'ar'
          ? 'لم نتمكن من فهم الصوت. يرجى المحاولة مرة أخرى.'
          : 'Could not understand the audio. Please try again.',
      })
    }

    return NextResponse.json({
      transcript,
      confidence,
      language,
    })
  } catch (error) {
    console.error('Error in transcribe route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
