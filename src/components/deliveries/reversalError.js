import { formatKg } from '../../utils/format'

// The backend refuses to reverse or correct a delivery whose batch already has sold kg (409), with
// an English message. This gives the same error with the message in the manager's language; any
// other error is returned as it is, so its own message is shown.
const SOLD = /already has ([\d.]+) kg sold/

export function plainReversalError(t, error) {
  const match = error.response?.status === 409 && SOLD.exec(error.response.data?.message ?? '')
  if (!match) return error
  const message = t('reversal.delivery.batchSold', { kg: formatKg(Number(match[1])) })
  return { ...error, response: { ...error.response, data: { ...error.response.data, message } } }
}
