// Base API client with error handling

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { signal?: AbortSignal; timeoutMs?: number } = {}
  ): Promise<T> {
    const maxAttempts = (options.method || 'GET') === 'GET' ? 3 : 1

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.requestOnce<T>(endpoint, options)
      } catch (error: any) {
        const isLastAttempt = attempt >= maxAttempts
        const isNetworkError =
          error?.name === 'TypeError' ||
          /Failed to fetch/i.test(error?.message || '') ||
          /NetworkError/i.test(error?.message || '')

        if (isLastAttempt || !isNetworkError) {
          throw error
        }

        await new Promise((resolve) => setTimeout(resolve, attempt * 500))
      }
    }

    throw new Error('Unexpected API request retry state')
  }

  private async requestOnce<T>(
    endpoint: string,
    options: RequestInit & { signal?: AbortSignal; timeoutMs?: number } = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    console.debug('[ApiClient] request start', {
      method: options.method || 'GET',
      url,
    })

    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutMs = options.timeoutMs ?? 30000
    const timeoutId = timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null

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

      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      console.debug('[ApiClient] response received', {
        method: options.method || 'GET',
        url,
        status: response.status,
        statusText: response.statusText,
      })

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
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      if (error.name === 'AbortError') {
        throw new Error(`Request timeout - กรุณาลองใหม่อีกครั้ง (เกิน ${Math.round(timeoutMs / 1000)} วินาที)`)
      }

      console.error('API request failed:', {
        message: error?.message,
        name: error?.name,
        url,
      })
      throw error
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>, options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<T> {
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

  async post<T>(endpoint: string, data?: any, options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async put<T>(endpoint: string, data?: any, options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async delete<T>(endpoint: string, options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<T> {
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

