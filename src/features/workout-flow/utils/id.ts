let counter = 0

export function generateId(prefix: string): string {
  counter += 1
  const random = Math.floor(Math.random() * 1_000_000)
  return `${prefix}-${Date.now()}-${random}-${counter}`
}
