import { usePeople } from '../features/people/usePeople'
import { householdGreetingText } from '../lib/greeting'

export const Greeting = () => {
  const people = usePeople()
  const selfPerson = people.data?.find((p) => p.role === 'self')

  return (
    <>
      <h1 className="household-greeting">
        {householdGreetingText(selfPerson?.displayName)}
      </h1>
      <p className="household-subtitle">Here's how your household is doing.</p>
    </>
  )
}
