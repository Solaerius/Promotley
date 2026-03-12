export function formatEngagementRate(rate: number): string {
  return (Math.round(rate * 1000) / 10).toFixed(1) + '%'
}
