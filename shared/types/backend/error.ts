interface BackendErrorResponse {
  status: number
  message: string
  timestamp: string
  details: string | null
}

export type {
  BackendErrorResponse,
}
