import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { originLat, originLng, destLat, destLng } = await req.json()

  if (
    typeof originLat !== 'number' ||
    typeof originLng !== 'number' ||
    typeof destLat !== 'number' ||
    typeof destLng !== 'number'
  ) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Maps API key not configured' }, { status: 500 })
  }

  const url =
    `https://maps.googleapis.com/maps/api/distancematrix/json` +
    `?origins=${originLat},${originLng}` +
    `&destinations=${destLat},${destLng}` +
    `&mode=driving` +
    `&units=imperial` +
    `&key=${apiKey}`

  const res = await fetch(url)
  const data = await res.json()

  const element = data?.rows?.[0]?.elements?.[0]
  if (!element || element.status !== 'OK') {
    return NextResponse.json({ error: 'Could not calculate distance' }, { status: 422 })
  }

  return NextResponse.json({
    distanceText: element.distance.text,
    durationText: element.duration.text,
    distanceMeters: element.distance.value,
    durationSeconds: element.duration.value,
  })
}
