import { useState } from 'react'
import { useHistory } from 'react-router-dom'
import type { Status } from '../lib/status'

interface RadarPerson {
    id: string
    displayName: string
    avatarUrl?: string | null
    status: Status
}

const SIZE = 200
const CENTER = SIZE / 2
const MAX_RADIUS = CENTER - 12 // leave room for avatars (reduced padding)
const AVATAR_R = 16

const levelColors: Record<Status['color'], string> = {
    success: 'var(--ion-color-success)',
    warning: 'var(--ion-color-warning)',
    danger: 'var(--ion-color-danger)',
    medium: 'var(--ion-color-medium)',
}

const AVATAR_COLORS = [
    '4A2D8B', 'E8453C', '7B5EBF', '2FAE60', '3D2575', '5C3F9E',
]

function colorForName(name: string): string {
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function fallbackAvatarUrl(name: string): string {
    const bg = colorForName(name)
    return `https://ui-avatars.com/api/?background=${bg}&color=fff&bold=true&name=${encodeURIComponent(name || '?')}`
}

function RadarAvatar({ href, fallback, clipPath, r }: { href: string; fallback: string; clipPath: string; r: number }) {
    const [src, setSrc] = useState(href)
    return (
        <image
            href={src}
            x={-r}
            y={-r}
            width={r * 2}
            height={r * 2}
            clipPath={clipPath}
            preserveAspectRatio="xMidYMid slice"
            onError={() => {
                if (src !== fallback) setSrc(fallback)
            }}
        />
    )
}

/**
 * A simple radar / bull's-eye chart.
 * People with higher scores sit near the center (calm);
 * lower scores push dots toward the outer ring (distress).
 * Each person is shown as their avatar image with a colored border.
 */
const INNER_RING = MAX_RADIUS * 0.33 // first ring = 100% score

export function HouseholdRadar({ people }: { people: RadarPerson[] }) {
    const history = useHistory()
    const withScores = people.filter((p) => p.status.score !== null)

    return (
        <div className="household-radar">
            <div className="household-radar__layout">
                <div className="household-radar__text">
                    <h2 className="household-radar__title">Household Distress Radar</h2>
                    <p className="household-radar__subtitle">Tap a person to check in</p>
                </div>
                <svg
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                className="household-radar__svg household-radar__svg--full"
                aria-label="Household distress radar"
            >
                <defs>
                    {withScores.map((person) => (
                        <clipPath key={person.id} id={`avatar-clip-${person.id}`}>
                            <circle cx="0" cy="0" r={AVATAR_R - 2} />
                        </clipPath>
                    ))}
                </defs>

                {/* Concentric rings */}
                {[0.33, 0.66, 1].map((pct) => (
                    <circle
                        key={pct}
                        cx={CENTER}
                        cy={CENTER}
                        r={MAX_RADIUS * pct}
                        fill="none"
                        stroke="var(--ion-color-light-shade)"
                        strokeWidth={1}
                    />
                ))}

                {/* Cross-hairs */}
                <line x1={CENTER} y1={CENTER - MAX_RADIUS} x2={CENTER} y2={CENTER + MAX_RADIUS} stroke="var(--ion-color-light-shade)" strokeWidth={1} />
                <line x1={CENTER - MAX_RADIUS} y1={CENTER} x2={CENTER + MAX_RADIUS} y2={CENTER} stroke="var(--ion-color-light-shade)" strokeWidth={1} />

                {/* Person avatars */}
                {withScores.map((person, i) => {
                    const score = person.status.score!
                    // 100% → first ring (INNER_RING), 0% → outer edge (MAX_RADIUS)
                    const dist = INNER_RING + ((100 - score) / 100) * (MAX_RADIUS - INNER_RING)
                    const angle = (2 * Math.PI * i) / Math.max(withScores.length, 1) - Math.PI / 2
                    const cx = CENTER + dist * Math.cos(angle)
                    const cy = CENTER + dist * Math.sin(angle)
                    const imgSrc = person.avatarUrl || fallbackAvatarUrl(person.displayName)
                    const borderColor = levelColors[person.status.color]

                    return (
                        <g key={person.id} transform={`translate(${cx},${cy})`} style={{ cursor: 'pointer' }} onClick={() => history.push(`/person/${person.id}`)}>
                            {/* Colored border ring */}
                            <circle
                                cx={0}
                                cy={0}
                                r={AVATAR_R}
                                fill={borderColor}
                            />
                            {/* Avatar image clipped to circle */}
                            <RadarAvatar
                                href={imgSrc}
                                fallback={fallbackAvatarUrl(person.displayName)}
                                clipPath={`url(#avatar-clip-${person.id})`}
                                r={AVATAR_R - 2}
                            />
                            <title>{person.displayName}: {score}%</title>
                        </g>
                    )
                })}
            </svg>
            </div>
        </div>
    )
}
