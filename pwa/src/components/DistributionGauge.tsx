const mean = (values: number[]) =>
  values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : null

const percentile = (values: number[], fraction: number) => {
  const ordered = [...values].sort((left, right) => left - right)
  const position = (ordered.length - 1) * fraction
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  return lower === upper
    ? ordered[lower]
    : ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)
}

const format = (value: number) => String(Math.round(value * 10) / 10)

export const DistributionGauge = ({
  title,
  recentValues,
  baselineValues,
  direction,
  unitLabel,
  scaleMode,
  compact = false,
  hideSummary = false,
  hideZeroTypical = false,
}: {
  title: string
  recentValues: number[]
  baselineValues: number[]
  direction: 'higher-is-worse' | 'higher-is-better'
  unitLabel: string
  scaleMode: 'absolute-100' | 'normalize-to-100'
  compact?: boolean
  hideSummary?: boolean
  hideZeroTypical?: boolean
}) => {
  if (!recentValues.length) return null
  const rawBaseline = mean(baselineValues)
  const hasBaseline = baselineValues.length >= 3 && rawBaseline !== null
  const adverseHistoricalMaximums = [14, 30, baselineValues.length]
    .map((size) => baselineValues.slice(-size))
    .filter((values) => values.length >= 3)
    .map((values) => Math.max(...values))
    .filter((value) => value > 0)
  const referenceMaximum =
    scaleMode === 'absolute-100'
      ? 100
      : direction === 'higher-is-worse' && adverseHistoricalMaximums.length
        ? Math.min(...adverseHistoricalMaximums)
      : Math.max(1, ...recentValues, hasBaseline ? rawBaseline : 0)
  const values = recentValues.map((value) => (value / referenceMaximum) * 100)
  const baseline = hasBaseline ? (rawBaseline / referenceMaximum) * 100 : null
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const typicalLow = percentile(values, 0.25)
  const typicalHigh = percentile(values, 0.75)
  const position = (value: number) => {
    const bounded = Math.max(0, Math.min(100, value))
    return direction === 'higher-is-worse' ? 100 - bounded : bounded
  }
  const rawTypicalLow = percentile(recentValues, 0.25)
  const rawTypicalHigh = percentile(recentValues, 0.75)
  const rawMinimum = Math.min(...recentValues)
  const rawMaximum = Math.max(...recentValues)
  const boxLeft = Math.min(position(typicalLow), position(typicalHigh))
  const boxWidth = Math.max(1, Math.abs(position(typicalHigh) - position(typicalLow)))
  const showTypical = !hideZeroTypical || rawTypicalLow !== 0 || rawTypicalHigh !== 0

  return (
    <figure className={`relative-distribution relative-distribution--${direction}`}>
      <figcaption>
        <strong>{title}</strong>
        {!compact && <span>{scaleMode === 'absolute-100' ? 'Fixed 0–100 scale' : `100% = ${format(referenceMaximum)} ${unitLabel}`}</span>}
      </figcaption>
      <div
        className="relative-distribution__plot"
        role="img"
        aria-label={`${title}: typical recent range ${format(rawTypicalLow)} to ${format(rawTypicalHigh)} ${unitLabel}; minimum ${format(rawMinimum)}; maximum ${format(rawMaximum)}${rawBaseline === null ? '' : `; baseline ${format(rawBaseline)}`}`}
      >
        <div className="relative-distribution__rail" />
        <div
          className="relative-distribution__whisker"
          style={{
            left: `${Math.min(position(minimum), position(maximum))}%`,
            width: `${Math.abs(position(maximum) - position(minimum))}%`,
          }}
        />
        <span className="relative-distribution__cap" style={{ left: `${position(minimum)}%` }} />
        <span className="relative-distribution__cap" style={{ left: `${position(maximum)}%` }} />
        {showTypical && (
          <div
            className="relative-distribution__box"
            style={{
              left: `${boxLeft}%`,
              width: `${boxWidth}%`,
            }}
          >
            <span
              className="relative-distribution__box-fill"
              style={{
                width: `${10000 / boxWidth}%`,
                left: `${(-100 * boxLeft) / boxWidth}%`,
              }}
            />
          </div>
        )}
        {baseline !== null && (
          <span className="relative-distribution__baseline" style={{ left: `${position(baseline)}%` }} />
        )}
      </div>
      {!compact && (
        <div className="relative-distribution__axis" aria-hidden="true">
          <span>{`${direction === 'higher-is-worse' ? 100 : 0}${scaleMode === 'normalize-to-100' ? '%' : ''}`}</span>
          <span>{`${direction === 'higher-is-worse' ? 0 : 100}${scaleMode === 'normalize-to-100' ? '%' : ''}`}</span>
        </div>
      )}
      {!hideSummary && <div className="relative-distribution__summary">
        {compact ? (
          <span>
            Typical {format(rawTypicalLow)}–{format(rawTypicalHigh)}
            {hasBaseline ? ` · Baseline ${format(rawBaseline!)}` : ''}
            {' · '}Range {format(rawMinimum)}–{format(rawMaximum)}
          </span>
        ) : (
          <>
            <span>Typical {format(rawTypicalLow)}–{format(rawTypicalHigh)} {unitLabel}</span>
            {hasBaseline && <span>Baseline {format(rawBaseline!)} {unitLabel}</span>}
            <span>Min {format(rawMinimum)} · Max {format(rawMaximum)}</span>
          </>
        )}
      </div>}
      {!compact && !hasBaseline && <small>More earlier observations are needed to add a baseline.</small>}
    </figure>
  )
}
