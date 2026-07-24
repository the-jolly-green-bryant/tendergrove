import type { ReactNode } from 'react'

export const ResearchConceptCard = ({
  id,
  title,
  children,
  qualification,
}: {
  id?: string
  title: string
  children: ReactNode
  qualification: string
}) => (
  <article
    id={id}
    className="research-concept-card"
  >
    <h3>{title}</h3>
    <div>{children}</div>
    <p className="research-concept-card__qualification">{qualification}</p>
  </article>
)
