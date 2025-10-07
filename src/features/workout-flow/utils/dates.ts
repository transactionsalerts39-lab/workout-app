export function formatDateLabel(dateISO: string): string {
  const date = new Date(dateISO)
  if (Number.isNaN(date.getTime())) {
    return dateISO
  }
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
  })
}
