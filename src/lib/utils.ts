import { type ClassValue, clsx } from 'clsx'

// Simple cn utility without tailwind-merge to keep deps minimal
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function generateSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function getVibeEmoji(vibe: string): string {
  const map: Record<string, string> = {
    'Chill / Easy': '😌',
    'Burn Energy': '🏃',
    'Outdoor / Nature': '🌲',
    'Rainy Day': '🌧️',
    'Special / Treat': '✨',
    'Animals': '🐾',
    'Transportation': '🚂',
  }
  return map[vibe] || '📌'
}

export function getCostDisplay(cost: string): string {
  return cost === 'Free' ? 'Free' : cost
}
