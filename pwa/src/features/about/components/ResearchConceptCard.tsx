import type { ReactNode } from 'react'
import { FlippableCard } from '../../../components/FlippableCard'

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
  <FlippableCard
    id={id}
    className="research-concept-card"
    title={title}
    description={qualification}
  >
    <div>{children}</div>
  </FlippableCard>
)
