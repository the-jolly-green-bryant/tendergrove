import React, { useState } from 'react'
import { useHistory } from 'react-router-dom'
import type { Status } from '../lib/status'

export interface BloomMember {
  id: string
  displayName: string
  avatarUrl?: string | null
  status: Status
}

interface BloomProps {
  members: BloomMember[]
  title?: string
  subtitle?: string
}

const SIZE = 400
const CENTER = SIZE / 2

// Map score (0-100) to petal properties
const getPetalProps = (score: number) => {
  const color =
    score < 45
      ? '#E2594B' // crisis coral
      : score < 70
        ? '#EFAE45' // watch gold
        : '#8BB368' // stable green

  const scale = 0.62 + (score / 100) * 0.38
  const opacity = 0.35 + (score / 100) * 0.45

  return { scale, color, opacity, isCrisis: score < 45 }
}

const Petal = ({
  angle,
  score,
  member,
  onClick,
  index: i,
}: {
  angle: number
  score: number
  member?: BloomMember
  onClick?: () => void
  index: number
}) => {
  const { scale, color, opacity, isCrisis } = getPetalProps(score)

  // Mask ID for this petal
  const filterId = `petal-filter-${i}`

  // Opacity for ghost petals
  const ghostOpacity = 0.2

  // Hex to RGB conversion for feColorMatrix
  const r = parseInt(color.slice(1, 3), 16) / 255
  const g = parseInt(color.slice(3, 5), 16) / 255
  const b = parseInt(color.slice(5, 7), 16) / 255

  return (
    <g transform={`translate(${CENTER}, ${CENTER}) rotate(${angle})`}>
      <defs>
        {/* Grayscale to Color Matrix Filter */}
        <filter
          id={filterId}
          colorInterpolationFilters="sRGB"
        >
          <feColorMatrix
            type="matrix"
            values={`0 0 0 0 ${r}
                     0 0 0 0 ${g}
                     0 0 0 0 ${b}
                     1 0 0 0 0`}
          />
        </filter>
      </defs>

      <g
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
        transform-origin={`50% 92%`}
      >
        {/* Main Petal Layer */}
        <g transform={`scale(${scale}) translate(-100, -184)`}>
          {/* Edge Bleed Layer (underneath) */}
          <image
            href={`/assets/bloom/assets/petal_edge_bleed_mask_0${(i % 3) + 1}.png`}
            width="200"
            height="200"
            opacity={(member ? opacity : ghostOpacity) * 0.4}
            style={{ mixBlendMode: 'multiply' }}
          />
          {/* Base Grayscale Petal with Color Filter */}
          <image
            href="/assets/bloom/assets/petal_master_grayscale.png"
            width="200"
            height="200"
            filter={`url(#${filterId})`}
            opacity={member ? opacity : ghostOpacity}
            style={{ mixBlendMode: 'multiply' }}
          />
          {/* Pigment/Shadow Layer */}
          <image
            href="/assets/bloom/assets/petal_pigment_shadow_overlay.png"
            width="200"
            height="200"
            opacity={member ? 0.3 : 0.1}
            style={{ mixBlendMode: 'multiply' }}
          />
          {/* Highlight Layer */}
          <image
            href="/assets/bloom/assets/petal_highlight_overlay.png"
            width="200"
            height="200"
            opacity={member ? 0.2 : 0.05}
            style={{ mixBlendMode: 'screen' }}
          />
          {/* Extra Atmosphere Splatters */}
          {member && (
            <image
              href={`/assets/bloom/assets/splatter_0${(i % 5) + 1}_${score < 45 ? 'coral' : score < 70 ? 'gold' : 'green'}.png`}
              x={-120}
              y={-220}
              width="240"
              height="240"
              opacity={opacity * 0.2}
              style={{ pointerEvents: 'none' }}
            />
          )}
        </g>

        {member && (
          <g transform={`rotate(${-angle})`}>
            <AvatarOnPetal
              member={member}
              dist={-180 * scale}
              isCrisis={isCrisis}
            />
          </g>
        )}
      </g>
    </g>
  )
}

const AvatarOnPetal = ({
  member,
  dist,
  isCrisis,
}: {
  member: BloomMember
  dist: number
  isCrisis: boolean
}) => {
  const AVATAR_R = 18
  const imgSrc =
    member.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName)}&background=random`

  const cy = dist

  return (
    <g transform={`translate(0, ${cy})`}>
      <defs>
        <clipPath id={`avatar-clip-${member.id}`}>
          <circle
            cx="0"
            cy="0"
            r={AVATAR_R}
          />
        </clipPath>
      </defs>

      {/* Pulse/Halo for Crisis */}
      {isCrisis && (
        <circle
          cx="0"
          cy="0"
          r={AVATAR_R + 4}
          fill="none"
          stroke="#E2594B"
          strokeWidth="2"
          opacity="0.6"
        >
          <animate
            attributeName="r"
            from={AVATAR_R + 2}
            to={AVATAR_R + 10}
            dur="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            from="0.6"
            to="0"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Soft glow/backing for avatar */}
      <circle
        cx="0"
        cy="0"
        r={AVATAR_R + 3}
        fill="white"
        fillOpacity="0.8"
        filter="blur(2px)"
      />

      <image
        href={imgSrc}
        x={-AVATAR_R}
        y={-AVATAR_R}
        width={AVATAR_R * 2}
        height={AVATAR_R * 2}
        clipPath={`url(#avatar-clip-${member.id})`}
        preserveAspectRatio="xMidYMid slice"
        onError={(e) => {
          const target = e.target as SVGImageElement
          const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName)}&background=random`
          if (target.getAttribute('href') !== fallback) {
            target.setAttribute('href', fallback)
          }
        }}
      />
      <text
        y={AVATAR_R + 14}
        textAnchor="middle"
        fontSize="11"
        fontWeight="500"
        fill="var(--ion-text-color)"
        style={{ pointerEvents: 'none' }}
      >
        {member.displayName}
      </text>
    </g>
  )
}

export const Bloom = ({ members, title, subtitle }: BloomProps) => {
  const history = useHistory()
  const numPetals = Math.max(4, members.length)
  const averageScore =
    members.length > 0
      ? members.reduce((acc, m) => acc + (m.status.score || 0), 0) / members.length
      : 70

  return (
    <div
      className="bloom-container"
      style={{
        textAlign: 'center',
        padding: '0 0 24px 0',
        background: 'transparent',
        margin: '0',
        width: '100%',
        maxWidth: 'none',
      }}
    >
      {title && (
        <h2
          style={{
            margin: '0 0 4px 0',
            fontSize: '1.4rem',
            color: 'var(--ion-text-color)',
            fontWeight: '700',
          }}
        >
          {title}
        </h2>
      )}
      {subtitle && (
        <p style={{ margin: '0 0 16px 0', color: 'var(--app-muted-text)' }}>
          {subtitle}
        </p>
      )}

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width="100%"
        height="auto"
        style={{ display: 'block', margin: '0 auto' }}
      >
        <defs>
          {/* Enhanced Watercolor-like filter */}
          <filter
            id="watercolor"
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
          >
            {/* Texture for paper-like feel */}
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.04"
              numOctaves="4"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="8"
              result="displacement"
            />
            {/* Soft edge bleed */}
            <feGaussianBlur
              in="displacement"
              stdDeviation="1.5"
              result="blur"
            />
            <feComposite
              in="displacement"
              in2="blur"
              operator="over"
            />
          </filter>

          <pattern
            id="paperGrain"
            patternUnits="userSpaceOnUse"
            width="200"
            height="200"
          >
            <image
              href="/assets/bloom/assets/paper_grain_overlay.png"
              width="200"
              height="200"
            />
          </pattern>
        </defs>

        {/* Background Paper Grain (optional but recommended) */}
        <rect
          x="0"
          y="0"
          width={SIZE}
          height={SIZE}
          fill="url(#paperGrain)"
          opacity="0.05"
          style={{ pointerEvents: 'none' }}
        />

        {/* Petals */}
        {Array.from({ length: numPetals }).map((_, i) => {
          const angle = (i * 360) / numPetals
          const member = members[i]
          const score = member ? member.status.score || 0 : averageScore

          // Ghost petals for single member
          if (members.length === 1 && i > 0) {
            return (
              <Petal
                key={`ghost-${i}`}
                angle={angle}
                score={70} // Stable score for ghosts
                index={i}
              />
            )
          }

          return (
            <Petal
              key={member?.id || `extra-${i}`}
              angle={angle}
              score={score}
              member={member}
              onClick={member ? () => history.push(`/person/${member.id}`) : undefined}
              index={i}
            />
          )
        })}

        {/* Center Hub */}
        <g transform={`translate(${CENTER}, ${CENTER})`}>
          <image
            href="/assets/bloom/assets/hub_ring_only.png"
            x="-40"
            y="-40"
            width="80"
            height="80"
            opacity="0.8"
          />
          <image
            href="/assets/bloom/assets/hub_leaf_filled.png"
            x="-30"
            y="-30"
            width="60"
            height="60"
            opacity="0.4"
            style={{ mixBlendMode: 'multiply' }}
          />
          {members.length === 1 && (
            <text
              y="8"
              textAnchor="middle"
              fontSize="22"
              fontWeight="bold"
              fill="var(--ion-text-color)"
              style={{ pointerEvents: 'none' }}
            >
              {Math.round(members[0].status.score ?? 0)}
            </text>
          )}
        </g>
      </svg>
    </div>
  )
}
