import {
  buildPatternStrainTrend,
  PATTERN_STRAIN_LABELS,
  type PatternDynamicsDay,
} from '../analytics'

import '../patterns.scss'

const formatDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })

export const PatternStrainSparkline = ({
  days,
  endDate,
  showAxisLabels = true,
}: {
  days: PatternDynamicsDay[]
  endDate: string
  showAxisLabels?: boolean
}) => {
  const trend = buildPatternStrainTrend(days, endDate)
  const values = trend.flatMap((point) =>
    point.intensity === null ? [] : [point.intensity],
  )
  if (!values.length) return null

  const width = 320
  const height = 82
  const padX = showAxisLabels ? 30 : 8
  const padY = 8
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const padding = Math.max(5, Math.round((rawMax - rawMin) * 0.15))
  const lowerBound = Math.max(0, rawMin - padding)
  const upperBound = Math.min(100, rawMax + padding)
  const span = Math.max(1, upperBound - lowerBound)
  const x = (index: number) =>
    padX + index * ((width - padX * 2) / Math.max(1, trend.length - 1))
  const y = (value: number) =>
    padY + (upperBound - value) * ((height - padY * 2) / span)
  const segments = trend.reduce<Array<Array<(typeof trend)[number] & { index: number }>>>(
    (groups, point, index) => {
      if (point.intensity === null) return groups
      const previous = trend[index - 1]
      if (!previous || previous.intensity === null) groups.push([])
      groups.at(-1)!.push({ ...point, index })
      return groups
    },
    [],
  )

  return (
    <figure
      className={`pattern-strain-sparkline${showAxisLabels ? '' : ' pattern-strain-sparkline--compact'}`}
    >
      <figcaption>
        <strong>Recent Strain</strong>
        <span>Higher = more strain</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Recent rolling Pattern Strain intensity"
      >
        {showAxisLabels && (
          <>
            <text
              className="pattern-strain-sparkline__bound"
              x="2"
              y={padY + 4}
            >
              {upperBound}
            </text>
            <text
              className="pattern-strain-sparkline__bound"
              x="2"
              y={height - padY}
            >
              {lowerBound}
            </text>
          </>
        )}
        {lowerBound < 55 && upperBound > 55 && (
          <line
            x1={padX}
            x2={width - padX}
            y1={y(55)}
            y2={y(55)}
          />
        )}
        {segments.map((segment) => (
          <polyline
            key={segment[0].date}
            points={segment
              .map((point) => `${x(point.index)},${y(point.intensity!)}`)
              .join(' ')}
          />
        ))}
        {trend.map(
          (point, index) =>
            point.intensity !== null &&
            point.band && (
              <circle
                key={point.date}
                className={`pattern-strain-sparkline__point pattern-strain-sparkline__point--${point.band}`}
                cx={x(index)}
                cy={y(point.intensity)}
                r="3.5"
              >
                <title>
                  {formatDate(point.date)}: {PATTERN_STRAIN_LABELS[point.band]}
                </title>
              </circle>
            ),
        )}
      </svg>
      {showAxisLabels && (
        <div className="pattern-strain-sparkline__dates">
          <span>{formatDate(trend[0].date)}</span>
          <span>{formatDate(trend.at(-1)!.date)}</span>
        </div>
      )}
    </figure>
  )
}
