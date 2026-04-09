'use client'

interface DriveTimeDisplayProps {
  minutes: number
}

export default function DriveTimeDisplay({ minutes }: DriveTimeDisplayProps) {
  if (!minutes || minutes <= 0) return null

  return (
    <div className="flex items-center justify-center gap-1.5 py-1 text-xs text-gray-400">
      <span>🚗</span>
      <span>{minutes} min travel</span>
      <div className="flex-1 border-t border-dashed border-gray-200" />
    </div>
  )
}
