import type { CSSProperties } from 'react'

const CONFETTI_COLORS = ['#6366f1', '#f97316', '#22c55e', '#ec4899', '#0ea5e9']

interface ConfettiBurstProps {
  active: boolean
}

export function ConfettiBurst({ active }: ConfettiBurstProps) {
  if (!active) return null

  const pieces = Array.from({ length: 14 }, (_, index) => ({
    id: index,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    angle: (Math.random() * 40 - 20).toFixed(2),
    distanceX: (Math.random() * 140 - 70).toFixed(2),
    distanceY: (Math.random() * 160).toFixed(2),
    delay: (Math.random() * 120).toFixed(0),
  }))

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {pieces.map((piece) => (
        <span key={piece.id} className="confetti-piece" style={createConfettiStyle(piece)} />
      ))}
    </div>
  )
}

type ConfettiPiece = {
  id: number
  color: string
  angle: string
  distanceX: string
  distanceY: string
  delay: string
}

type ConfettiStyle = CSSProperties & {
  '--tw-confetti-x'?: string
  '--tw-confetti-y'?: string
}

function createConfettiStyle(piece: ConfettiPiece): ConfettiStyle {
  return {
    backgroundColor: piece.color,
    transform: `rotate(${piece.angle}deg)` as string,
    top: '0%',
    left: '50%',
    animationDelay: `${piece.delay}ms`,
    '--tw-confetti-x': `${piece.distanceX}%`,
    '--tw-confetti-y': `${piece.distanceY}%`,
  }
}
