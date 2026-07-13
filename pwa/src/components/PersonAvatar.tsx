import { IonAvatar } from '@ionic/react'
import { useEffect, useState } from 'react'

const AVATAR_COLORS = ['147D7E', '75C8C4', '2FAE60', 'E88972', '8AA39B', 'C9A66B']

const colorForName = (name: string): string => {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

const fallbackUrl = (name: string): string => {
  const bg = colorForName(name)
  return `https://ui-avatars.com/api/?background=${bg}&color=fff&bold=true&name=${encodeURIComponent(name || '?')}`
}

export const PersonAvatar = ({
  name,
  src,
  slot,
  className,
}: {
  readonly name: string
  readonly src?: string | null
  readonly slot?: string
  readonly className?: string
}) => {
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
