import React, { useMemo } from 'react'
import './HouseholdTree.css'

import { PersonAvatar } from './PersonAvatar'
import { Greeting } from './Greeting'

interface Person {
  id: string
  displayName: string
  avatarUrl?: string | null
  energy: number // 0-100
  isSelf?: boolean
}

interface HouseholdTreeProps {
  people: Person[]
  className?: string
  showGreeting?: boolean
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

const getHouseholdNarrative = (
  score: number,
  people: Person[],
): { status: string; insight: string } => {
  const strugglingPerson = people.find((p) => p.energy <= 40)
  const isSingle = people.length === 1

  if (score > 80) {
    return {
      status: 'Thriving',
      insight: isSingle
        ? 'You are radiating positive energy and staying resilient.'
        : 'Everyone is doing well. Your household is radiating positive energy.',
    }
  }
  if (score > 60) {
    return {
      status: 'Growing steadily',
      insight: isSingle
        ? 'You are finding a healthy rhythm and maintaining good resilience.'
        : strugglingPerson
          ? `${strugglingPerson.displayName} could use a little extra support today, but overall resilience remains good.`
          : 'Your household is finding a healthy rhythm together.',
    }
  }
  if (score > 40) {
    return {
      status: 'Holding steady',
      insight: isSingle
        ? 'Consistency is improving as you navigate the week.'
        : strugglingPerson
          ? `${strugglingPerson.displayName} has had a difficult week, but consistency is improving.`
          : 'Maintaining a stable foundation as you navigate the week.',
    }
  }
  if (score > 20) {
    return {
      status: 'Recovering',
      insight: isSingle
        ? 'Consistency is improving. Keep focusing on your daily check-ins.'
        : 'Your household is showing resilience. Consistency is improving as you reconnect.',
    }
  }
  return {
    status: 'Needs care',
    insight: isSingle
      ? 'Take some time for self-care. A little extra attention to your wellbeing goes a long way today.'
      : 'Take some time to reconnect. A little extra attention to each other goes a long way today.',
  }
}

export const HouseholdTree: React.FC<HouseholdTreeProps> = ({
  people,
  className = '',
  showGreeting = false,
}) => {
  const householdScore = useMemo(() => {
    if (people.length === 0) return 0
    const total = people.reduce((acc, p) => acc + p.energy, 0)
    return Math.min(100, Math.max(0, Math.round(total / people.length)))
  }, [people])

  const stage = getTreeStage(householdScore)
  const narrative = getHouseholdNarrative(householdScore, people)

  const selfPerson = people.find((p) => p.isSelf)
  const isSinglePerson = people.length === 1

  return (
    <div className={`household-tree-container ${className}`}>
      <div className={`household-tree-card ${isSinglePerson ? 'is-single' : ''}`}>
        {showGreeting && (
          <div className="household-tree-greeting">
            <Greeting />
          </div>
        )}
        {!showGreeting && isSinglePerson && selfPerson && (
          <div className="household-tree-greeting">
            <h1 className="household-greeting">Hi, {selfPerson.displayName}</h1>
            <p className="household-subtitle">Here's a look at your wellbeing.</p>
          </div>
        )}
        <div className="tree-composition">
          {/* Avatars positioned relative to tree-visualization center */}
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

            {/* Avatars Overlay */}
            <div className="avatars-overlay">
              {people.map((person, index) => {
                const angle = (Math.PI * 2 * index) / people.length - Math.PI / 2

                // Radius is relative to the container center.
                // Using percentages for positioning
                const radiusX = 42
                const radiusY = 42

                const x = 50 + radiusX * Math.cos(angle)
                const y = 50 + radiusY * Math.sin(angle)

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
                      <PersonAvatar
                        name={person.displayName}
                        src={person.avatarUrl}
                        className="avatar-img"
                      />
                      <div
                        className="avatar-score-badge"
                        style={{ backgroundColor: color }}
                      >
                        {person.energy}
                        {isSinglePerson && '%'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="section-divider"></div>

        <div className="household-summary">
          <div className="household-wellbeing-label">
            {people.length === 1 ? 'Your Wellbeing' : 'Household Wellbeing'}
          </div>
          <div className="household-score-value">{householdScore}</div>
          <div className="household-narrative">
            <div className="status">{narrative.status}</div>
            <div className="insight">{narrative.insight}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
