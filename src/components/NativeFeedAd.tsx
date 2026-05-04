'use client'

// Native in-feed ads via @brandonknudsen/admob-native-advanced are not
// compatible with Capacitor 8. This component is a safe no-op placeholder
// that renders nothing. It exists so Feed.tsx imports do not break.
// Future: replace with a working native ad solution when available.

export function NativeFeedAd(_props: { adUnitId?: string }) {
  return null
}
