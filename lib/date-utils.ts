import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'

export function formatTransactionDate(dateString: string): string {
  const date = new Date(dateString)
  
  if (isToday(date)) {
    return 'Today'
  }
  
  if (isYesterday(date)) {
    return 'Yesterday'
  }
  
  // Within last 7 days
  const daysDiff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (daysDiff < 7) {
    return formatDistanceToNow(date, { addSuffix: true })
  }
  
  // Older than 7 days
  return format(date, 'MMM d')
}