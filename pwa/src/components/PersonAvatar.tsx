import { IonAvatar } from '@ionic/react'
import { useEffect, useState } from 'react'

const AVATAR_COLORS = [
  '4A2D8B', // primary purple
  'E8453C', // red
  '7B5EBF', // secondary purple
  '2FAE60', // green
  '3D2575', // dark purple
  '5C3F9E', // mid purple
]

function colorForName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function fallbackUrl(name: string): string {
  const bg = colorForName(name)
  return `https://ui-avatars.com/api/?background=${bg}&color=fff&bold=true&name=${encodeURIComponent(name || '?')}`
}

/**
 *
 */
export function PersonAvatar({
  name,
  src,
  slot,
  className,
}: {
  name: string
  src?: string | null
  slot?: string
  className?: string
}) {
  const fallback = fallbackUrl(name)
  const [imgSrc, setImgSrc] = useState(src || fallback)

  // Keep the displayed image in sync when the source or name changes.
  useEffect(() => {
    setImgSrc(src || fallback)
  }, [src, fallback])

  return (
    <IonAvatar
      slot={slot}
      className={className}
    >
      <img
        src={imgSrc}
        alt={name}
        onError={() => {
          // Bad/broken URL — fall back to the generated default.
          if (imgSrc !== fallback) {
            setImgSrc(fallback)
          }
        }}
      />
    </IonAvatar>
  )
}
