import { useTranslation } from 'react-i18next'
import { reverseEntry } from '../../api/ledger'
import ReasonDialog from '../ReasonDialog'
import { useEntryDescription } from './ledgerDisplay'

// Every entry type can be asked; the backend answers 409 with a message for the types it cannot
// reverse (shares, sales and losses), and the dialog shows that message.
export default function ReverseEntryDialog({ entry, onClose, onReversed }) {
  const { t } = useTranslation()
  const describe = useEntryDescription()

  async function handleConfirm(reason) {
    onReversed(await reverseEntry(entry.id, reason))
  }

  return (
    <ReasonDialog
      title={t('ledger.reverse.title', { id: entry.id })}
      summary={describe(entry)}
      explanation={t('ledger.reverse.explanation')}
      confirmLabel={t('ledger.reverse.confirm')}
      onConfirm={handleConfirm}
      onClose={onClose}
    />
  )
}
