import { usePeople } from '../features/people/usePeople'

export function Greeting() {
  const people = usePeople()

  const hour = new Date().getHours()
  const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'

  const selfPerson = people.data?.find((p) => p.role === 'self')
  const name = selfPerson ? `, ${selfPerson.displayName}` : ''

  return (
    <>
      <h1 className="household-greeting">
        Good {period}
        {name} 👋
      </h1>
      <p className="household-subtitle">Here's how your household is doing.</p>
    </>
  )
}
