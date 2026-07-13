export const householdGreetingText = (
  selfName?: string,
  date: Date = new Date(),
): string => {
  const hour = date.getHours()
  const period = (() => {
    if (hour < 12) return 'morning'
    if (hour < 18) return 'afternoon'
    return 'evening'
  })()
  const name = selfName ? `, ${selfName}` : ''

  return `Good ${period}${name} 👋`
}
