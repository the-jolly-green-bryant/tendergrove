export const CardExplanation = ({
  summary,
  points = [],
}: {
  readonly summary: string
  readonly points?: readonly string[]
}) => (
  <div className="card-explanation">
    <p>{summary}</p>
    {points.length > 0 && (
      <ul>
        {points.map((point) => <li key={point}>{point}</li>)}
      </ul>
    )}
  </div>
)
