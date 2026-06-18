import { IonAvatar } from '@ionic/react'
import { useEffect, useState } from 'react'

function fallbackUrl(name: string): string {
  return `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(name || '?')}`
}

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
    <IonAvatar slot={slot} className={className}>
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
