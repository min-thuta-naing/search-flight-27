// Base API client with error handling

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { signal?: AbortSignal } = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 seconds timeout

    try {
      const response = await fetch(url, {
        ...options,
        signal: options.signal ?
          anySignal([controller.signal, options.signal]) :
          controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = new Error(`API Error: ${response.status} ${response.statusText}`) as Error & {
          status?: number;
          statusText?: string;
          url?: string;
        }
        error.status = response.status
        error.statusText = response.statusText
        error.url = url
        throw error
      }

      return await response.json()
    } catch (error: any) {
      clearTimeout(timeoutId)

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - กรุณาลองใหม่อีกครั้ง (เกิน 30 วินาที)')
      }

      console.error('API request failed:', error)
      throw error
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>, options: { signal?: AbortSignal } = {}): Promise<T> {
    const queryString = params
      ? (() => {
          const filtered = Object.fromEntries(
            Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
          );
          const search = new URLSearchParams(filtered as Record<string, string>).toString();
          return search ? `?${search}` : '';
        })()
      : ''
    return this.request<T>(endpoint + queryString, { ...options, method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any, options: { signal?: AbortSignal } = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async put<T>(endpoint: string, data?: any, options: { signal?: AbortSignal } = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async delete<T>(endpoint: string, options: { signal?: AbortSignal } = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

/**
 * Helper to combine multiple AbortSignals
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      return signal;
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return controller.signal;
}

export const apiClient = new ApiClient(
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
)

