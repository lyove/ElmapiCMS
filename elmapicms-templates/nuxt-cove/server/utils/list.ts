export function asList<T>(response: T[] | { data: T[] } | unknown): T[] {
  if (Array.isArray(response)) return response as T[]
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: T[] }).data
  }
  return []
}
