import React, { useMemo } from 'react'
import './HouseholdTree.css'

interface Person {
  id: string
  displayName: string
  avatarUrl?: string | null
  energy: number // 0-100
}

interface HouseholdTreeProps {
  people: Person[]
  className?: string
}

const getTreeStage = (score: number): number => {
  if (score <= 20) return 1
  if (score <= 40) return 2
  if (score <= 60) return 3
  if (score <= 80) return 4
  return 5
}

const getStatusColor = (score: number): string => {
  if (score <= 20) return '#EF5350' // Red
  if (score <= 40) return '#FB8C00' // Orange
  if (score <= 60) return '#FBC02D' // Amber
  if (score <= 80) return '#8BC34A' // Light Green
  return '#43A047' // Green
}

export const HouseholdTree: React.FC<HouseholdTreeProps> = ({
  people,
  className = '',
}) => {
  const householdScore = useMemo(() => {
    if (people.length === 0) return 0
    const total = people.reduce((acc, p) => acc + p.energy, 0)
    return Math.min(100, Math.max(0, Math.round(total / people.length)))
  }, [people])

  const stage = getTreeStage(householdScore)

  const isSinglePerson = people.length === 1

  return (
    <div className={`household-tree-container ${className}`}>
      <div className="household-tree-card">
        <div className="tree-visualization">
          {/* Tree Image */}
          <div className="tree-image-wrapper">
            {[1, 2, 3, 4, 5].map((s) => (
              <img
                key={s}
                src={`/assets/tree/tree_stage_${s}.png`}
                alt={`Tree stage ${s}`}
                className={`tree-image ${stage === s ? 'active' : ''}`}
              />
            ))}
          </div>

          {/* Avatars */}
          <div className="avatars-overlay">
            {people.map((person, index) => {
              const angle = (Math.PI * 2 * index) / people.length - Math.PI / 2
              // Radius is relative to the container.
              // Spec says 115% of tree radius. If tree radius is ~35% of width,
              // avatar radius should be ~42% of width.
              const radiusX = 42 // percentage
              const radiusY = 40 // percentage to account for aspect ratio/vertical space

              const x = 50 + radiusX * Math.cos(angle)
              const y = 50 + (isSinglePerson ? -radiusY : radiusY * Math.sin(angle))

              const color = getStatusColor(person.energy)

              return (
                <div
                  key={person.id}
                  className="avatar-container"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                  }}
                >
                  <div
                    className="avatar-ring"
                    style={{ borderColor: color }}
                  >
                    {person.avatarUrl ? (
                      <img
                        src={person.avatarUrl}
                        alt={person.displayName}
                        className="avatar-img"
                      />
                    ) : (
                      <div className="avatar-placeholder">{person.displayName[0]}</div>
                    )}
                  </div>
                  <div className="avatar-info">
                    <span className="avatar-name">{person.displayName}</span>
                    <span
                      className="avatar-score"
                      style={{ color }}
                    >
                      {person.energy}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="household-summary">
          <div className="household-score-label">Household Score</div>
          <div className="household-score-value">{householdScore}</div>
          <div className="household-status">
            {householdScore > 80
              ? 'Thriving'
              : householdScore > 40
                ? 'Growing'
                : 'Needs Care'}
          </div>
        </div>
      </div>
    </div>
  )
}
