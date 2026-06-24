export const not =
  <T>(predicate: (value: T) => boolean) =>
  (value: T) =>
    !predicate(value)
