import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatKg, formatMoney } from '../../utils/format'

// Display only: the backend stores kg and amounts as positive numbers (a reversal stores them
// negated) and the hashes cover those stored values. Here each type gets the sign that tells the
// manager which way the stock or the money moved. 0 means "show without a sign", null means "—".
const SIGNS = {
  DELIVERY: { kg: 1, amount: null },
  LOSS: { kg: -1, amount: null },
  SALE: { kg: -1, amount: 1 },
  SHARE: { kg: null, amount: 0 },
  PAYMENT: { kg: null, amount: -1 },
}

// A reversal does not say which type it reverses, but the backend attaches the same references as
// the original entry, and each type has its own combination (see LedgerQueryService.references).
export function reversedType(entry) {
  const hasMember = entry.memberId != null
  const hasLot = entry.lotId != null
  const hasReference = entry.referenceCode != null
  if (hasLot && hasMember) return hasReference ? 'DELIVERY' : 'SHARE'
  if (hasLot) return hasReference ? 'SALE' : 'LOSS'
  if (hasMember) return 'PAYMENT'
  return null
}

export function entrySigns(entry) {
  if (entry.type !== 'REVERSAL') return SIGNS[entry.type] ?? { kg: null, amount: null }
  const original = SIGNS[reversedType(entry)] ?? { kg: null, amount: null }
  // Opposite of the original; an unsigned share becomes money taken back.
  const flip = (sign) => (sign === null ? null : sign === 0 ? -1 : -sign)
  return { kg: flip(original.kg), amount: flip(original.amount) }
}

export function SignedValue({ value, sign, format }) {
  if (sign === null || value == null) return <span className="text-muted">—</span>
  const text = format(Math.abs(Number(value)))
  if (sign === 0) return <span>{text}</span>
  return sign > 0 ? <span className="text-primary">+{text}</span> : <span className="text-danger">−{text}</span>
}

export function EntryKg({ entry }) {
  return <SignedValue value={entry.quantityKg} sign={entrySigns(entry).kg} format={formatKg} />
}

export function EntryAmount({ entry }) {
  return <SignedValue value={entry.amountRwf} sign={entrySigns(entry).amount} format={formatMoney} />
}

// A sale has no member; its stored text is "Sale SAL-… from LOT-… to <buyer>". The prefix is
// built from the entry's own codes, so a buyer name that contains " to " still reads correctly.
export function saleBuyer(entry) {
  if (entry.type !== 'SALE') return null
  const prefix = `Sale ${entry.referenceCode} from ${entry.lotCode} to `
  return entry.description.startsWith(prefix) ? entry.description.slice(prefix.length) : null
}

// The member as a link to the profile, or the buyer for a sale.
export function EntryParty({ entry }) {
  if (entry.memberId) {
    return (
      <Link to={`/members/${entry.memberId}`} className="text-primary hover:underline">
        {entry.memberName}
      </Link>
    )
  }
  return saleBuyer(entry) ?? <span className="text-muted">–</span>
}

// The text after "Loss from LOT-…: " is the stored loss reason (ROT, DRYING, ...).
function lossReason(entry) {
  return entry.description.slice(entry.description.lastIndexOf(': ') + 2).trim()
}

// The stored text is "Payment PAY-… by METHOD <reference>".
function paymentMethod(entry) {
  return /^Payment \S+ by (\S+)/.exec(entry.description)?.[1]
}

// The stored text is "Reversal of entry #N: <reason>".
function reversalReason(entry) {
  const separator = entry.description.indexOf(': ')
  return separator === -1 ? '' : entry.description.slice(separator + 2)
}

// Builds the description from the entry's fields so it can be translated; the stored text is used
// when a field is missing.
export function useEntryDescription() {
  const { t } = useTranslation()

  return function describe(entry) {
    switch (entry.type) {
      case 'DELIVERY':
        return t('ledger.describe.delivery', { code: entry.referenceCode, fee: formatMoney(Math.abs(entry.amountRwf ?? 0)) })
      case 'LOSS': {
        const reason = lossReason(entry)
        return t('ledger.describe.loss', {
          lot: entry.lotCode,
          reason: t(`lots.loss.reasons.${reason}`, { defaultValue: reason }),
        })
      }
      case 'SALE':
        return t('ledger.describe.sale', { code: entry.referenceCode, lot: entry.lotCode })
      case 'SHARE':
        return t('ledger.describe.share', { lot: entry.lotCode, member: entry.memberName })
      case 'PAYMENT': {
        const method = paymentMethod(entry)
        if (!method) return entry.description
        return t('ledger.describe.payment', {
          code: entry.referenceCode,
          method: t(`payments.methods.${method}`, { defaultValue: method }),
        })
      }
      case 'REVERSAL':
        if (entry.reversesEntryId == null) return entry.description
        return t('ledger.describe.reversal', { id: entry.reversesEntryId, reason: reversalReason(entry) })
      default:
        return entry.description
    }
  }
}
