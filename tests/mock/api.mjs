// Mock of the CoopAggregate REST API for the browser tests, on port 4199. It keeps its data in memory
// and follows the backend's contracts closely enough for the pages under test; it is not the backend.
// POST /__set merges into `config` and `settings` and adds data; GET /__log lists the requests;
// unmocked paths answer 404 and are listed in /__missing.
import http from 'node:http'

// Identity: verifyStatus, startError, callbackError and createError ({ status, message, code }),
// authorizationUrl (where start sends the manager), useBeforeMs (how long a verification lasts).
const config = { saleErrors: [], settingsError: null, verifyStatus: { available: true, required: true }, startError: null,
  callbackError: null, createError: null, authorizationUrl: 'http://localhost:4181/identity/callback?code=good-code&state=good-state', useBeforeMs: 30 * 60 * 1000,
  verifiedDetails: null, verifiedNationalId: null }
const ALL_DETAILS = { birthdate: '1990-05-17', gender: 'Female', email: 'uwase.diane@example.rw', address: 'KG 7 Ave, Kacyiru, Gasabo, Rwanda' }
const FIELD_ORDER = ['fullName', 'phone', 'birthdate', 'gender', 'email', 'address']
const detailsNow = () => ({ birthdate: null, gender: null, email: null, address: null, ...(config.verifiedDetails ?? ALL_DETAILS) })
const fieldsOf = (d) => FIELD_ORDER.filter((f) => f === 'fullName' || f === 'phone' || d[f] != null)
const settings = {
  cooperativeName: 'Koperative Test', cooperativeEmail: null, cooperativePhone: null, location: 'Busogo',
  minOrderKg: 100, smsEnabled: false, committeeEmails: [], deductionPerKg: 5, lotSizeKg: 100,
}
const grades = [
  { id: 1, code: 'A', name: 'Grade A', nameRw: 'Icyiciro A', active: true, floorPricePerKg: 250, description: null, sizeInfo: null, packaging: null },
  { id: 2, code: 'B', name: 'Grade B', nameRw: 'Icyiciro B', active: true, floorPricePerKg: 200, description: null, sizeInfo: null, packaging: null },
]
const members = [
  { id: 1, memberCode: 'M-0001', fullName: 'Mukamana Alice', phone: '+250788000001', nationalId: '1199880012345678', address: 'Busogo', joinDate: '2026-01-10', preferredLanguage: 'rw', status: 'ACTIVE', verified: true, verificationMethod: 'PASSWORD', verifiedAt: '2026-10-20T09:00:00Z',
    birthDate: '1988-03-02', gender: 'Female', email: null, verifiedFields: ['fullName', 'phone', 'birthdate', 'gender', 'address'] },
  { id: 2, memberCode: 'M-0002', fullName: 'Habimana Jean', phone: '+250788000002', nationalId: null, address: null, joinDate: '2026-02-11', preferredLanguage: 'rw', status: 'ACTIVE', verified: false, verificationMethod: null, verifiedAt: null,
    birthDate: null, gender: null, email: null, verifiedFields: [] },
]
// As the backend (987df00): 16 characters, the last 4 shown; all dots under 8 characters; null without an ID.
function maskNationalId(id) {
  if (!id || !id.trim()) return null
  const v = id.trim()
  return v.length < 8 ? '•'.repeat(16) : '•'.repeat(12) + v.slice(-4)
}
const buyers = [{ id: 1, name: 'Musanze Market Ltd', phone: '+250788111222', type: 'TRADER', createdAt: '2026-05-01T08:00:00Z' },
  { id: 2, name: 'Kigali Fresh Co', phone: '+250788333444', type: 'TRADER', createdAt: '2026-05-02T08:00:00Z' }]

const lot = (o) => ({
  gradeName: 'Grade A', olderLot: false, capacityKg: 100, spaceLeftKg: 0, shortfallKg: 0, lostKg: 0, soldKg: 0,
  pendingConfirmationKg: 0, saleAmountRwf: 0, memberCount: 2, closedAt: null, members: [], ...o,
})
const lots = [
  lot({ id: 10, code: 'A-2025-07', status: 'CLOSED', olderLot: true, capacityKg: null, deliveredKg: 300, soldKg: 100, remainingKg: 200, saleAmountRwf: 30000, memberCount: 1, createdAt: '2025-09-01', closedAt: '2025-12-01',
    members: [{ memberId: 1, memberName: 'Mukamana Alice', memberNumber: 'M-0001', kg: 300, soldKg: 100, lostKg: 0, remainingKg: 200 }] }),
  lot({ id: 11, code: 'A-2026-01', status: 'FULL', deliveredKg: 100, lostKg: 10, remainingKg: 90, createdAt: '2026-10-01', closedAt: '2026-10-20',
    members: [
      { memberId: 1, memberName: 'Mukamana Alice', memberNumber: 'M-0001', kg: 60, soldKg: 0, lostKg: 6, remainingKg: 54 },
      { memberId: 2, memberName: 'Habimana Jean', memberNumber: 'M-0002', kg: 40, soldKg: 0, lostKg: 4, remainingKg: 36 },
    ] }),
  lot({ id: 12, code: 'A-2026-02', status: 'FILLING', deliveredKg: 72, spaceLeftKg: 28, remainingKg: 72, createdAt: '2026-10-20',
    members: [
      { memberId: 2, memberName: 'Habimana Jean', memberNumber: 'M-0002', kg: 30, soldKg: 0, lostKg: 0, remainingKg: 30 },
      { memberId: 1, memberName: 'Mukamana Alice', memberNumber: 'M-0001', kg: 42, soldKg: 0, lostKg: 0, remainingKg: 42 },
    ] }),
  lot({ id: 13, code: 'B-2026-01', gradeName: 'Grade B', status: 'FULL', deliveredKg: 80, shortfallKg: 20, remainingKg: 80, memberCount: 1, createdAt: '2026-09-01', closedAt: '2026-09-15',
    members: [{ memberId: 2, memberName: 'Habimana Jean', memberNumber: 'M-0002', kg: 80, soldKg: 0, lostKg: 0, remainingKg: 80 }] }),
  lot({ id: 14, code: 'B-2026-02', gradeName: 'Grade B', status: 'SOLD', deliveredKg: 100, soldKg: 100, remainingKg: 0, saleAmountRwf: 30000, memberCount: 1, createdAt: '2026-09-15', closedAt: '2026-09-30',
    members: [{ memberId: 2, memberName: 'Habimana Jean', memberNumber: 'M-0002', kg: 100, soldKg: 100, lostKg: 0, remainingKg: 0 }] }),
]
const history = []
const lotById = (id) => lots.find((l) => l.id === Number(id))
const portion = (lotId, kg, extra = {}) => {
  const l = lotById(lotId)
  return { lotId, lotCode: l.code, lotStatus: l.status, kg, soldKg: 0, lostKg: 0, remainingKg: kg, ...extra }
}
const today = new Date().toISOString()
const delivery = (o) => {
  const m = members.find((x) => x.id === o.memberId)
  const g = grades.find((x) => x.id === (o.gradeId ?? 1))
  return {
    gradeId: g.id, gradeName: g.name, memberName: m.fullName, memberNumber: m.memberCode, deductionRwf: Math.round(o.quantityKg * 5),
    deliveredAt: '2026-10-15T08:00:00Z', syncedAt: '2026-10-15T08:00:05Z', reversed: false, reversalReason: null, correctsId: null,
    correctedById: null, confirmationStatus: 'CONFIRMED', confirmationMethod: 'SMS_CODE', confirmationLabel: 'SMS code', codeResendsLeft: 3,
    confirmedAt: '2026-10-15T09:00:00Z', disputeReason: null, disputeNote: null, disputedAt: null, resolutionNote: null,
    ...o, lotId: o.lots[0]?.lotId ?? null, lotCode: o.lots[0]?.lotCode ?? null,
  }
}
const TEN_LOTS = Array.from({ length: 10 }, (_, i) => ({ lotId: 20 + i, lotCode: `A-2026-${String(5 + i).padStart(2, '0')}`, lotStatus: 'FULL', kg: i === 9 ? 55 : 105, soldKg: 0, lostKg: 0, remainingKg: i === 9 ? 55 : 105 }))
const deliveries = [
  delivery({ id: 5, receiptCode: 'RCT-0005', memberId: 1, quantityKg: 300, deliveredAt: '2025-10-01T08:00:00Z', lots: [portion(10, 300, { lotStatus: 'CLOSED', soldKg: 100, remainingKg: 200 })] }),
  delivery({ id: 1, receiptCode: 'RCT-0001', memberId: 1, quantityKg: 60, lots: [portion(11, 60, { lostKg: 6, remainingKg: 54 })] }),
  delivery({ id: 2, receiptCode: 'RCT-0002', memberId: 2, quantityKg: 70, lots: [portion(11, 40, { lostKg: 4, remainingKg: 36 }), portion(12, 30)] }),
  delivery({ id: 3, receiptCode: 'RCT-0003', memberId: 1, quantityKg: 42, deliveredAt: today, lots: [portion(12, 42)] }),
  delivery({ id: 4, receiptCode: 'RCT-0004', memberId: 2, quantityKg: 25, deliveredAt: today, confirmationStatus: 'PENDING', confirmationMethod: null, confirmationLabel: null, confirmedAt: null, lots: [] }),
  delivery({ id: 6, receiptCode: 'RCT-0006', memberId: 2, gradeId: 2, quantityKg: 80, lots: [portion(13, 80)] }),
  // A 1,000 kg delivery spread over ten lots A-2026-05 ... A-2026-14 (lots 20 to 29, not in the lots list).
  delivery({ id: 7, receiptCode: 'RCT-0007', memberId: 1, quantityKg: 1000, deliveredAt: '2026-10-16T08:00:00Z', lots: TEN_LOTS }),
  delivery({ id: 8, receiptCode: 'RCT-0008', memberId: 1, quantityKg: 15, confirmationStatus: 'DISPUTED', confirmationMethod: null, confirmationLabel: null, confirmedAt: null,
    disputeReason: 'WRONG_QUANTITY', disputeNote: 'I brought 18 kg', disputedAt: '2026-10-28T10:00:00Z', lots: [] }),
]
// Disputed after it went into two lots (shown in the disputes list only).
const disputedInLots = delivery({ id: 9, receiptCode: 'RCT-0009', memberId: 2, quantityKg: 30, confirmationStatus: 'DISPUTED',
  disputeReason: 'WRONG_GRADE', disputeNote: null, disputedAt: '2026-10-30T10:00:00Z', lots: [portion(11, 10), portion(12, 20)] })

const page = (content, size = 20) => ({ content, page: 0, size, totalElements: content.length, totalPages: content.length ? 1 : 0 })

// First in first out by lot: the older lot, then the fixed-size lots in fill order. Inside a lot the
// kg are shared in proportion to what each portion has left.
const FIFO = { 1: [10, 11, 12], 2: [13] }
function units(gradeId) {
  return FIFO[gradeId].map((lotId) => ({
    lot: lotById(lotId),
    portions: deliveries.filter((d) => d.confirmationStatus === 'CONFIRMED')
      .flatMap((d) => d.lots.filter((p) => p.lotId === lotId && p.remainingKg > 0).map((p, i) => ({ d, p, id: d.id * 100 + lotId + i }))),
  }))
}
// As backend 27c4b82: always the oldest lot first, nothing can be skipped.
const NO_SKIPPING = 'Lots cannot be skipped: sales always use the oldest lot first.'
const asksSkip = (b) => ['skipLotIds', 'skipDeliveryIds'].some((k) => b?.[k]?.length) || (b?.skipReason ?? '').trim() !== ''
function plan(gradeId, quantityKg, price) {
  const skipLots = []
  const all = units(gradeId)
  const sellable = all.filter((u) => !skipLots.includes(u.lot.id)).reduce((s, u) => s + u.portions.reduce((a, x) => a + x.p.remainingKg, 0), 0)
  let left = quantityKg
  const lines = []
  let lastUsed = -1
  all.forEach((u, index) => {
    if (left <= 0 || skipLots.includes(u.lot.id)) return
    const avail = u.portions.reduce((a, x) => a + x.p.remainingKg, 0)
    if (avail <= 0) return
    const take = Math.min(left, avail)
    left = Math.round((left - take) * 100) / 100
    lastUsed = index
    let given = 0
    u.portions.forEach((x, i) => {
      const kg = i === u.portions.length - 1 ? Math.round((take - given) * 100) / 100 : Math.floor((take * x.p.remainingKg / avail) * 100) / 100
      given = Math.round((given + kg) * 100) / 100
      const gross = Math.round(kg * price)
      const deduction = Math.round(kg * settings.deductionPerKg)
      lines.push({ deliveryId: x.d.id, lotPortionId: x.id, receiptCode: x.d.receiptCode, lotId: u.lot.id, lotCode: u.lot.code,
        memberId: x.d.memberId, memberNumber: x.d.memberNumber, memberName: x.d.memberName, deliveredAt: x.d.deliveredAt,
        takeKg: kg, remainingAfterKg: Math.round((x.p.remainingKg - kg) * 100) / 100, kg, grossRwf: gross, deductionRwf: deduction, netRwf: gross - deduction })
    })
  })
  return { lines, sellable, enough: left <= 0 }
}

const ledger = [
  { id: 41, entryDate: '2026-10-15T09:00:00Z', type: 'DELIVERY', reversedType: null, description: 'Delivery RCT-0002', referenceCode: 'RCT-0002', memberId: 2, memberName: 'Habimana Jean', buyerName: null, lotId: 11, lotCode: 'A-2026-01, A-2026-02', quantityKg: 70, amountRwf: -350, shortHash: 'ab12cd', hash: 'ab12cd'.padEnd(64, '0'), previousHash: '0'.repeat(64), reversesEntryId: null, reversedByEntryId: null },
  { id: 42, entryDate: '2026-10-15T09:01:00Z', type: 'DELIVERY', reversedType: null, description: 'Delivery RCT-0004', referenceCode: 'RCT-0004', memberId: 2, memberName: 'Habimana Jean', buyerName: null, lotId: null, lotCode: null, quantityKg: 25, amountRwf: -125, shortHash: 'ef34ab', hash: 'ef34ab'.padEnd(64, '0'), previousHash: '0'.repeat(64), reversesEntryId: null, reversedByEntryId: null },
  { id: 43, entryDate: '2026-10-29T09:01:00Z', type: 'LOSS', reversedType: null, description: 'Loss of 10 kg from lot A-2026-01: ROT', referenceCode: null, memberId: null, memberName: null, buyerName: null, lotId: 11, lotCode: 'A-2026-01', quantityKg: 10, amountRwf: null, shortHash: '99aa00', hash: '99aa00'.padEnd(64, '0'), previousHash: '0'.repeat(64), reversesEntryId: null, reversedByEntryId: null },
  { id: 45, entryDate: '2026-10-16T09:00:00Z', type: 'DELIVERY', reversedType: null, description: 'Delivery RCT-0007', referenceCode: 'RCT-0007', memberId: 1, memberName: 'Mukamana Alice', buyerName: null, lotId: 20, lotCode: TEN_LOTS.map((l) => l.lotCode).join(', '), quantityKg: 1000, amountRwf: -5000, shortHash: 'cc10dd', hash: 'cc10dd'.padEnd(64, '0'), previousHash: '0'.repeat(64), reversesEntryId: null, reversedByEntryId: null },
  { id: 44, entryDate: '2026-10-30T09:01:00Z', type: 'SALE_CREDIT', reversedType: null, description: 'Credit for sale SAL-7K2Q from RCT-0002', referenceCode: 'SAL-7K2Q', memberId: 2, memberName: 'Habimana Jean', buyerName: null, lotId: 12, lotCode: 'A-2026-02', quantityKg: 11.25, amountRwf: 3319, shortHash: '77bb11', hash: '77bb11'.padEnd(64, '0'), previousHash: '0'.repeat(64), reversesEntryId: null, reversedByEntryId: null },
]
const oldSale = {
  id: 7, saleCode: 'SAL-7K2Q', orderCode: null, gradeId: 1, gradeName: 'Grade A', lotId: null, lotCode: null, lotStatus: null, buyerId: 1, buyerName: 'Musanze Market Ltd',
  quantityKg: 52.5, pricePerKg: 300, totalAmountRwf: 15750, belowFloor: false, soldAt: '2026-10-30', createdAt: '2026-10-30T09:00:00Z', totalDeductionRwf: 262, totalNetRwf: 15488,
  batches: [
    { deliveryId: 1, receiptCode: 'RCT-0001', lotId: 11, lotCode: 'A-2026-01', memberId: 1, memberNumber: 'M-0001', memberName: 'Mukamana Alice', kg: 25, grossRwf: 7500, deductionRwf: 125, netRwf: 7375 },
    { deliveryId: 2, receiptCode: 'RCT-0002', lotId: 11, lotCode: 'A-2026-01', memberId: 2, memberNumber: 'M-0002', memberName: 'Habimana Jean', kg: 16.25, grossRwf: 4875, deductionRwf: 81, netRwf: 4794 },
    { deliveryId: 2, receiptCode: 'RCT-0002', lotId: 12, lotCode: 'A-2026-02', memberId: 2, memberNumber: 'M-0002', memberName: 'Habimana Jean', kg: 11.25, grossRwf: 3375, deductionRwf: 56, netRwf: 3319 },
  ],
}

const log = []
const salesById = {
  31: { ...oldSale, id: 31, saleCode: 'SAL-0031', orderCode: 'ORD-0003', batches: [{ lotCode: 'A-2026-01' }, { lotCode: 'A-2026-02' }, { lotCode: 'A-2026-01' }] },
  32: { ...oldSale, id: 32, saleCode: 'SAL-0032', orderCode: 'ORD-0003', gradeId: 2, gradeName: 'Grade B', batches: [{ lotCode: 'B-2026-01' }] },
  33: { ...oldSale, id: 33, saleCode: 'SAL-0033', orderCode: 'ORD-0002', batches: [{ lotCode: 'A-2026-01' }] },
  34: { ...oldSale, id: 34, saleCode: 'SAL-0034', orderCode: 'ORD-0001', lotId: 10, lotCode: 'A-2025-07', lotStatus: 'SHARED', totalDeductionRwf: null, totalNetRwf: null, batches: [] },
}
const buyerPayments = [
  { orderId: 303, orderCode: 'ORD-0003', buyerId: 1, buyerName: 'Musanze Market Ltd', paidAt: '2026-11-08', createdAt: '2026-11-08T09:00:00Z', method: 'MOMO', reference: 'MP777001',
    totalKg: 120, totalAmountRwf: 35000, totalDeductionRwf: 600, totalNetRwf: 34400,
    sales: [{ saleId: 31, saleCode: 'SAL-0031', gradeId: 1, gradeName: 'Grade A', kg: 100, pricePerKg: 300, amountRwf: 30000 }, { saleId: 32, saleCode: 'SAL-0032', gradeId: 2, gradeName: 'Grade B', kg: 20, pricePerKg: 250, amountRwf: 5000 }],
    farmers: [{ memberId: 2, memberNumber: 'M-0002', memberName: 'Habimana Jean', kg: 50, grossRwf: 14000, deductionRwf: 250, netRwf: 13750 },
      { memberId: 1, memberNumber: 'M-0001', memberName: 'Mukamana Alice', kg: 70, grossRwf: 21000, deductionRwf: 350, netRwf: 20650 }] },
  { orderId: 302, orderCode: 'ORD-0002', buyerId: 2, buyerName: 'Kigali Fresh Co', paidAt: '2026-11-05', createdAt: '2026-11-05T09:00:00Z', method: 'CASH', reference: null,
    totalKg: 40, totalAmountRwf: 12000, totalDeductionRwf: 200, totalNetRwf: 11800,
    sales: [{ saleId: 33, saleCode: 'SAL-0033', gradeId: 1, gradeName: 'Grade A', kg: 40, pricePerKg: 300, amountRwf: 12000 }],
    farmers: [{ memberId: 1, memberNumber: 'M-0001', memberName: 'Mukamana Alice', kg: 40, grossRwf: 12000, deductionRwf: 200, netRwf: 11800 }] },
  { orderId: 301, orderCode: 'ORD-0001', buyerId: 1, buyerName: 'Musanze Market Ltd', paidAt: '2026-10-30', createdAt: '2026-10-30T09:00:00Z', method: null, reference: null,
    totalKg: 52.5, totalAmountRwf: 15750, totalDeductionRwf: null, totalNetRwf: null,
    sales: [{ saleId: 34, saleCode: 'SAL-0034', gradeId: 1, gradeName: 'Grade A', kg: 52.5, pricePerKg: 300, amountRwf: 15750 }],
    farmers: [{ memberId: 2, memberNumber: 'M-0002', memberName: 'Habimana Jean', kg: 27.5, grossRwf: null, deductionRwf: null, netRwf: null },
      { memberId: 1, memberNumber: 'M-0001', memberName: 'Mukamana Alice', kg: 25, grossRwf: null, deductionRwf: null, netRwf: null }] },
  // Older orders from the second buyer, so the list has more than one page.
  ...Array.from({ length: 20 }, (_, i) => ({ orderId: 200 + i, orderCode: `ORD-OLD${String(i + 1).padStart(2, '0')}`, buyerId: 2, buyerName: 'Kigali Fresh Co',
    paidAt: `2026-10-${String(20 - i).padStart(2, '0')}`, createdAt: '2026-10-01T09:00:00Z', method: 'BANK', reference: `BK-${i + 1}`, totalKg: 10, totalAmountRwf: 3000,
    totalDeductionRwf: 50, totalNetRwf: 2950, sales: [{ saleId: 900 + i, saleCode: `SAL-9${i}`, gradeId: 1, gradeName: 'Grade A', kg: 10, pricePerKg: 300, amountRwf: 3000 }],
    farmers: [{ memberId: 1, memberNumber: 'M-0001', memberName: 'Mukamana Alice', kg: 10, grossRwf: 3000, deductionRwf: 50, netRwf: 2950 }] })),
]
// As PaymentReferences: { status, message } when refused. Used once per method, ignoring case, across
// farmer payments (PAY-…) and buyer payments (ORD-…), like the backend's two lists.
const referenceRefusal = (method, reference, missing, usedIn) => {
  const value = (reference ?? '').trim()
  if (method === 'CASH') return null
  if (!value) return { status: 400, message: missing }
  if (value.length < 6 || value.length > 40 || !/^[A-Za-z0-9./-]+$/.test(value)) return { status: 400, message: `The ${method} reference must be 6 to 40 characters: letters, digits, dot (.), dash (-) or slash (/) only.` }
  const used = usedIn.find((x) => x.method === method && (x.reference ?? '').toLowerCase() === value.toLowerCase())
  if (used) return { status: 409, message: `Reference ${value} was already used for ${used.code}.` }
  return null
}
// As SaleService.checkedReference.
const paymentRefusal = (b) => {
  if (!b.paymentMethod) return { status: 400, message: 'paymentMethod: is required (CASH, MOMO or BANK)' }
  return referenceRefusal(b.paymentMethod, b.paymentReference, `A ${b.paymentMethod} buyer payment needs the transaction reference.`,
    buyerPayments.map((x) => ({ method: x.method, reference: x.reference, code: x.orderCode })))
}
const recordBuyerPayment = (b, sales) => {
  buyerPayments.unshift({ orderId: nextId++, orderCode: `ORD-NEW${saleNumber}`, buyerId: b.buyerId, buyerName: buyers.find((x) => x.id === b.buyerId)?.name, paidAt: b.soldAt,
    createdAt: new Date().toISOString(), method: b.paymentMethod, reference: (b.paymentReference ?? '').trim() || null,
    totalKg: sales.reduce((a, x) => a + x.quantityKg, 0), totalAmountRwf: sales.reduce((a, x) => a + x.totalAmountRwf, 0), totalDeductionRwf: 0, totalNetRwf: 0,
    sales: sales.map((x) => ({ saleId: x.id, saleCode: x.saleCode, gradeId: x.gradeId, gradeName: x.gradeName, kg: x.quantityKg, pricePerKg: x.pricePerKg, amountRwf: x.totalAmountRwf })), farmers: [] })
}
const missing = []
// Per member: extra sale credit lines, older lot shares (shareRwf) and their total deduction.
const payCredits = {
  1: [
    { saleCode: 'SAL-A1', soldAt: '2026-11-02', receiptCode: 'RCT-0001', lotCode: 'A-2026-01', kg: 40, pricePerKg: 300, grossRwf: 12000, deductionRwf: 200, netRwf: 11800, buyerName: 'Musanze Market Ltd' },
    { saleCode: 'SAL-A2', soldAt: '2026-11-05', receiptCode: 'RCT-0001', lotCode: 'A-2026-02', kg: 20, pricePerKg: 320, grossRwf: 6400, deductionRwf: 100, netRwf: 6300, buyerName: null },
  ],
  2: [{ saleCode: 'SAL-A1', soldAt: '2026-11-02', receiptCode: 'RCT-0002', lotCode: 'A-2026-01', kg: 10, pricePerKg: 300, grossRwf: 3000, deductionRwf: 50, netRwf: 2950, buyerName: 'Musanze Market Ltd' }],
}
const payOlder = { 1: { shares: [{ lotId: 10, lotCode: 'A-2025-07', status: 'SHARED', memberKg: 300, lotKg: 300, sharePercent: 100, shareRwf: 30000 }], deductionRwf: 1500 } }
const payments = [
  { id: 501, paymentCode: 'PAY-0501', memberId: 1, amountRwf: 10000, method: 'MOMO', reference: 'MP123456', paidAt: '2026-11-06', createdAt: '2026-11-06T10:00:00Z', reversed: false, reversalReason: null },
  { id: 502, paymentCode: 'PAY-0502', memberId: 1, amountRwf: 5000, method: 'CASH', reference: null, paidAt: '2026-11-07', createdAt: '2026-11-07T10:00:00Z', reversed: true, reversalReason: 'Paid twice by mistake' },
]
const statementOf = (memberId) => {
  const credits = payCredits[memberId] ?? []
  const older = payOlder[memberId] ?? { shares: [], deductionRwf: 0 }
  const gross = credits.reduce((a, c) => a + c.grossRwf, 0) + older.shares.reduce((a, l) => a + l.shareRwf, 0)
  const deductions = credits.reduce((a, c) => a + c.deductionRwf, 0) + older.deductionRwf
  const live = payments.filter((p) => p.memberId === memberId && !p.reversed)
  const paid = live.reduce((a, p) => a + p.amountRwf, 0)
  return { grossShareRwf: gross, deductionsRwf: deductions, paidRwf: paid, owedRwf: gross - deductions - paid, lotShares: older.shares, saleCredits: credits,
    payments: live.map((p) => ({ paymentCode: p.paymentCode, paidAt: p.paidAt, amountRwf: p.amountRwf, method: p.method, reference: p.reference })) }
}
const paymentOut = (p) => { const x = members.find((y) => y.id === p.memberId); return { ...p, memberName: x.fullName, memberNumber: x.memberCode } }
let nextId = 100
let saleNumber = 1

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS')
  res.setHeader('Content-Type', 'application/json')
  if (req.method === 'OPTIONS') return res.end()
  const url = new URL(req.url, 'http://localhost')
  const path = url.pathname
  const q = (name) => url.searchParams.get(name)
  let entry = null
  const send = (body, status = 200) => { if (entry) entry.status = status; res.statusCode = status; res.end(body === undefined ? '' : JSON.stringify(body)) }
  const fail = (status, message, code) => send({ status, message, ...(code && { code }) }, status)
  // National ID rules of backend e734a04: required for a new member, exactly 16 digits once trimmed,
  // unique (409 with memberCode), and one that is set cannot be removed. config.nidClash answers the
  // same-moment clash: NATIONAL_ID_TAKEN without memberCode.
  const nidError = (raw, self) => {
    const current = self?.nationalId ?? null
    const id = (raw ?? '').trim() || null
    if (!id) {
      if (!self || current) return () => fail(400, self ? 'nationalId: cannot be removed once it is set' : 'nationalId: is required', 'NATIONAL_ID_REQUIRED')
      return null
    }
    if (self && id === current) return null
    if (!/^[0-9]{16}$/.test(id)) return () => fail(400, 'nationalId: must be exactly 16 digits', 'NATIONAL_ID_INVALID')
    if (config.nidClash) return () => send({ status: 409, message: 'This national ID is already used by another member.', code: 'NATIONAL_ID_TAKEN' }, 409)
    const other = members.find((x) => x.nationalId === id && x !== self)
    if (other) return () => send({ status: 409, message: `This national ID is already used by member ${other.memberCode}.`, code: 'NATIONAL_ID_TAKEN', memberCode: other.memberCode }, 409)
    return null
  }
  let raw = ''
  req.on('data', (c) => (raw += c))
  req.on('end', () => {
    const api = path.startsWith('/api/')
    if (api && config.down) { log.push({ method: req.method, path, query: url.search, dropped: true }); return req.socket.destroy() }
    if (api && req.method === 'GET' && config.dropGets > 0) { config.dropGets--; log.push({ method: req.method, path, query: url.search, dropped: true }); return req.socket.destroy() }
    if (api && config.fail503 > 0) { config.fail503--; log.push({ method: req.method, path, query: url.search, status: 503 }); res.statusCode = 503; return res.end('<html>Service Unavailable</html>') }
    const wait = api && config.delayMs && (!config.delayPattern || new RegExp(config.delayPattern).test(`${req.method} ${path}`)) ? config.delayMs : 0
    setTimeout(() => handle(), wait)
  })
  function handle() {
    const body = raw ? JSON.parse(raw) : {}
    if (!path.startsWith('/__')) { entry = { method: req.method, path, query: url.search, body }; log.push(entry) }
    let m
    if (path === '/__log') return send(log)
    if (path === '/__missing') return send(missing)
    if (path === '/__set') { Object.assign(config, body.config ?? {}); Object.assign(settings, body.settings ?? {}); if (body.lots) lots.push(...body.lots.map(lot)); if (body.members) members.push(...body.members); if (body.deliveries) deliveries.push(...body.deliveries.map(delivery)); if (body.lotShares) config.lotShares = body.lotShares; if (body.memberUpdates) for (const [id, fields] of Object.entries(body.memberUpdates)) Object.assign(members.find((x) => x.id === Number(id)), fields); if (body.lotsBeingFilled) config.lotsBeingFilled = body.lotsBeingFilled; log.length = 0; return send({ ok: true }) }

    if (config.unauthorized && path.startsWith('/api/') && !path.startsWith('/api/public')) return fail(401, 'Unauthorized')
    if (path === '/api/auth/me') return send({ id: 1, name: 'Test Manager', email: 'manager@test.rw', role: 'MANAGER' })
    if (path === '/api/settings' && req.method === 'GET') return send(settings)
    if (path === '/api/settings' && req.method === 'PUT') {
      if (config.settingsError) return fail(400, config.settingsError)
      const changed = body.lotSizeKg != null && Number(body.lotSizeKg) !== Number(settings.lotSizeKg)
      const reason = (body.lotSizeReason ?? '').trim()
      if (changed && (reason.length < 10 || reason.length > 500)) {
        return fail(400, 'Give a reason of 10 to 500 characters to change the lot size.')
      }
      if (changed) {
        history.unshift({ id: history.length + 1, action: 'LOT_SIZE_CHANGED', memberId: null, memberName: null, managerName: 'Test Manager',
          details: `Lot size: ${Number(settings.lotSizeKg)} kg -> ${Number(body.lotSizeKg)} kg, for new lots only. Reason: ${reason}`, createdAt: new Date().toISOString() })
      }
      const { lotSizeReason, ...rest } = body
      Object.assign(settings, Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)))
      return send(settings)
    }
    if (path === '/api/settings/history') return send(page(history))
    if (path === '/api/grades') return send(grades)
    if (path === '/api/buyers' && req.method === 'GET') return send(buyers)

    if (path === '/api/members/summary') return send({ total: 2, active: 2, inactive: 0, joinedThisMonth: 0 })
    if (path === '/api/members/verify/status') return send(config.verifyStatus)
    if (path === '/api/members/verify/start') {
      if (config.startError) return fail(config.startError.status, config.startError.message, config.startError.code)
      return send({ provider: 'ESIGNET', authorizationUrl: config.authorizationUrl, state: 'good-state', expiresAt: new Date(Date.now() + 600000).toISOString() })
    }
    if (path === '/api/members/verify/callback') {
      if (config.callbackError) return fail(config.callbackError.status, config.callbackError.message, config.callbackError.code)
      const d = detailsNow()
      return send({ verificationId: 77, verified: true, method: 'OTP', fullName: 'Uwase Diane', phone: '+250788000099',
        useBefore: new Date(Date.now() + config.useBeforeMs).toISOString(), ...d, verifiedFields: [...fieldsOf(d), ...(config.verifiedNationalId ? ['nationalId'] : [])], nationalIdMasked: maskNationalId(config.verifiedNationalId) })
    }
    if (path === '/api/members/verify/cancel') { res.statusCode = 204; return res.end() }
    if (path === '/api/members' && req.method === 'POST') {
      if (config.createError) return fail(config.createError.status, config.createError.message, config.createError.code)
      if (config.verifyStatus.unverifiedAllowed) {
        const refused = ['verificationId', 'birthDate', 'birthdate', 'gender', 'email'].find((k) => k in body)
        if (refused) return fail(400, `${refused}: must not be sent when registering without verification`)
        if (!body.fullName) return fail(400, 'fullName: is required')
        if (!/^(\+?250|0)7[2389]\d{7}$/.test(body.phone ?? '')) return fail(400, 'phone: must be a Rwandan mobile number: 07XXXXXXXX, 2507XXXXXXXX or +2507XXXXXXXX')
        const bad = nidError(body.nationalId, null)
        if (bad) return bad()
        const created = { id: members.length + 1, memberCode: `M-000${members.length + 1}`, fullName: body.fullName, phone: `+250${body.phone.slice(-9)}`,
          nationalId: body.nationalId ?? null, address: body.address ?? null, joinDate: body.joinDate ?? null, preferredLanguage: body.preferredLanguage ?? 'rw',
          status: 'ACTIVE', verified: false, verificationMethod: null, verifiedAt: null, birthDate: null, gender: null, email: null, verifiedFields: [] }
        members.push(created)
        return send(created, 201)
      }
      const d = detailsNow()
      const fields = fieldsOf(d)
      const locked = ['fullName', 'phone', 'birthDate', 'birthdate', 'gender', 'email', 'address'].filter((k) => k in body && fields.includes(k === 'birthDate' ? 'birthdate' : k))
      if (locked.length) return fail(400, `${locked[0]}: comes from the identity verification and cannot be sent`, 'VERIFIED_FIELD_LOCKED')
      const typedOnly = ['birthDate', 'birthdate', 'gender', 'email'].find((k) => k in body)
      if (typedOnly) return fail(400, `${typedOnly}: can only come from the identity verification`)
      if (!body.verificationId) return fail(400, 'verificationId: is required')
      if (config.verifiedNationalId && 'nationalId' in body) return fail(400, 'This detail came from the identity check and cannot be changed here.', 'VERIFIED_FIELD_LOCKED')
      const bad = config.verifiedNationalId ? null : nidError(body.nationalId, null)
      if (bad) return bad()
      const created = { id: members.length + 1, memberCode: `M-000${members.length + 1}`, fullName: 'Uwase Diane', phone: '+250788000099',
        nationalId: config.verifiedNationalId ?? body.nationalId ?? null, address: d.address ?? body.address ?? null, joinDate: body.joinDate ?? null, preferredLanguage: body.preferredLanguage ?? 'rw',
        status: 'ACTIVE', verified: true, verificationMethod: 'OTP', verifiedAt: new Date().toISOString(),
        birthDate: d.birthdate, gender: d.gender, email: d.email, verifiedFields: [...fields, ...(config.verifiedNationalId ? ['nationalId'] : [])] }
      members.push(created)
      return send(created, 201)
    }
    if (path === '/api/members') {
      const s = (q('search') ?? '').toLowerCase()
      return send(page(members.filter((x) => !s || x.fullName.toLowerCase().includes(s) || x.memberCode.toLowerCase().includes(s) || (/^[A-Za-z0-9]{6,20}$/.test(q('search') ?? '') && x.nationalId === q('search'))).map(({ nationalId: id, ...rest }) => ({ ...rest, nationalIdMasked: maskNationalId(id) }))))
    }
    if ((m = /^\/api\/members\/(\d+)$/.exec(path)) && req.method === 'PUT') {
      const x = members.find((y) => y.id === Number(m[1]))
      if (config.updateError) return fail(config.updateError.status, config.updateError.message, config.updateError.code)
      const sentId = (body.nationalId ?? '').trim() || null
      if (sentId && x.verified && x.nationalId && sentId !== x.nationalId) return fail(400, 'The national ID of a verified member cannot be changed.', 'VERIFIED_FIELD_LOCKED')
      const bad = nidError(body.nationalId, x)
      if (bad) return bad()
      const address = (body.address ?? '').trim() || null
      if (address !== x.address) x.verifiedFields = x.verifiedFields.filter((f) => f !== 'address')
      Object.assign(x, { fullName: body.fullName, phone: body.phone.startsWith('0') ? `+250${body.phone.slice(1)}` : body.phone, nationalId: (body.nationalId ?? '').trim() || null, address, joinDate: body.joinDate, preferredLanguage: body.preferredLanguage })
      return send(x)
    }
    if ((m = /^\/api\/members\/(\d+)$/.exec(path))) return send(members.find((x) => x.id === Number(m[1])))
    if ((m = /^\/api\/members\/(\d+)\/batches$/.exec(path))) {
      const id = Number(m[1])
      const mine = deliveries.filter((d) => d.memberId === id)
      const batches = mine.map((d) => ({
        deliveryId: d.id, receiptCode: d.receiptCode, memberId: d.memberId, memberNumber: d.memberNumber, memberName: d.memberName, gradeName: d.gradeName,
        lotId: d.lotId, lotCode: d.lotCode, lotStatus: d.lots[0]?.lotStatus ?? null, deliveredAt: d.deliveredAt, receivedKg: d.quantityKg,
        soldKg: d.lots.reduce((a, p) => a + p.soldKg, 0), lostKg: d.lots.reduce((a, p) => a + p.lostKg, 0), remainingKg: d.lots.length ? d.lots.reduce((a, p) => a + p.remainingKg, 0) : d.quantityKg,
        confirmationStatus: d.confirmationStatus, grossRwf: 0, deductionRwf: 0, earnedRwf: 0, payment: 'NOTHING_SOLD', lots: d.lots,
      }))
      return send({ memberId: id, memberNumber: mine[0]?.memberNumber, memberName: mine[0]?.memberName, totals: { receivedKg: 0, soldKg: 0, lostKg: 0, remainingKg: 0 }, earnings: { grossRwf: 0, deductionRwf: 0, earnedRwf: 0 }, batches: page(batches) })
    }
    if ((m = /^.api.members.([0-9]+).statement$/.exec(path)) && config.paymentsMock) return send(statementOf(Number(m[1])))
    if ((m = /^\/api\/members\/(\d+)\/statement$/.exec(path))) {
      const credits = oldSale.batches.filter((b) => b.memberId === Number(m[1])).map((b) => ({ saleCode: oldSale.saleCode, soldAt: oldSale.soldAt, receiptCode: b.receiptCode, lotCode: b.lotCode, kg: b.kg, pricePerKg: 300, grossRwf: b.grossRwf, deductionRwf: b.deductionRwf, netRwf: b.netRwf }))
      return send({ grossShareRwf: 0, deductionsRwf: 0, paidRwf: 0, owedRwf: credits.reduce((a, c) => a + c.netRwf, 0), lotShares: config.lotShares ?? [], saleCredits: credits, payments: [] })
    }

    if (path === '/api/payments/balances') {
      const rows = Object.keys(payCredits).map(Number).map((id) => {
        const st = statementOf(id)
        const x = members.find((y) => y.id === id)
        const status = st.owedRwf <= 0 ? 'PAID' : st.paidRwf > 0 ? 'PART_PAID' : 'UNPAID'
        return { memberId: id, memberName: x.fullName, memberNumber: x.memberCode, phone: x.phone, shareRwf: st.grossShareRwf, deductionRwf: st.deductionsRwf, paidRwf: st.paidRwf, balanceRwf: st.owedRwf, status, settlement: st.owedRwf > 0 ? 'OWED' : 'SETTLED' }
      }).sort((a, b) => b.balanceRwf - a.balanceRwf)
      return send({ totalOwedRwf: rows.reduce((a, r) => a + r.balanceRwf, 0), paidThisWeekRwf: 10000, members: rows.filter((r) => (!q('status') || r.status === q('status')) && (!q('search') || r.memberName.toLowerCase().includes(q('search').toLowerCase()))) })
    }
    if (path === '/api/payments' && req.method === 'GET') {
      const list = payments.filter((p) => (!q('memberId') || p.memberId === Number(q('memberId'))) && (!q('method') || p.method === q('method'))).slice().reverse()
      return send(page(list.map(paymentOut), Number(q('size') ?? 20)))
    }
    if (path === '/api/payments' && req.method === 'POST') {
      const reference = (body.reference ?? '').trim() || null
      const refused = referenceRefusal(body.method, body.reference, `A ${body.method} payment needs the transaction reference.`,
        payments.map((x) => ({ method: x.method, reference: x.reference, code: x.paymentCode })))
      if (refused) return fail(refused.status, refused.message)
      const who = members.find((y) => y.id === body.memberId)
      // A sale credited the farmer while the dialog was open.
      if (config.creditBeforePay) {
        payCredits[body.memberId].push({ saleCode: 'SAL-LATE', soldAt: '2026-11-12', receiptCode: 'RCT-0001', lotCode: 'A-2026-02', kg: 5, pricePerKg: 300, grossRwf: config.creditBeforePay, deductionRwf: 0, netRwf: config.creditBeforePay, buyerName: 'Musanze Market Ltd' })
        config.creditBeforePay = null
      }
      const owed = statementOf(body.memberId).owedRwf
      if (owed <= 0) return fail(400, `Member ${who.memberCode} is owed nothing: there is nothing to disburse.`)
      if (body.amountRwf !== owed) return fail(400, `Member ${who.memberCode} is owed ${owed.toLocaleString('en-US')} RWF. Disburse the full amount.`)
      const p = { id: nextId++, paymentCode: `PAY-0${nextId}`, memberId: body.memberId, amountRwf: body.amountRwf, method: body.method, reference, paidAt: body.paidAt, createdAt: new Date().toISOString(), reversed: false, reversalReason: null }
      payments.push(p)
      return send(paymentOut(p), 201)
    }
    if ((m = /^.api.payments.([0-9]+).reverse$/.exec(path))) {
      const reason = (body.reason ?? '').trim()
      if (!reason) return fail(400, 'A reason is required to reverse a payment.')
      if (reason.length > 100) return fail(400, 'The reason can be at most 100 characters, because it is sent to the member by SMS.')
      if (config.reverseRefusal) return fail(400, config.reverseRefusal)
      const p = payments.find((y) => y.id === Number(m[1]))
      Object.assign(p, { reversed: true, reversalReason: reason })
      return send(paymentOut(p))
    }
    if (path === '/api/lots/stock') return send({ totalRemainingKg: 442, totalSellableKg: 442, totalWaitingKg: 25, totalDisputedKg: 15, totalDeliveredKg: 652, totalSoldKg: 200, totalLostKg: 10, pendingConfirmationKg: 0, addedTodayKg: 67, deliveriesToday: 2, openLots: 1, closedLots: 2, byGrade: [{ gradeName: 'Grade A', remainingKg: 362, sellableKg: 362, waitingKg: 25, disputedKg: 15 }, { gradeName: 'Grade B', remainingKg: 80, sellableKg: 80, waitingKg: 0, disputedKg: 0 }] })
    if (path === '/api/lots/open') {
      const open = lots.find((l) => l.status === 'FILLING' && grades.find((g) => g.id === Number(q('gradeId')))?.name === l.gradeName)
      if (!open) { res.statusCode = 204; return res.end() }
      return send({ id: open.id, code: open.code, gradeName: open.gradeName, totalKg: open.deliveredKg, capacityKg: open.capacityKg })
    }
    if (path === '/api/lots') {
      const list = lots.filter((l) => (!q('status') || l.status === q('status')) && (!q('gradeId') || grades.find((g) => g.id === Number(q('gradeId')))?.name === l.gradeName))
      return send(page(list.map(({ members: _members, ...rest }) => rest).reverse()))
    }
    if ((m = /^\/api\/lots\/(\d+)\/losses$/.exec(path))) {
      if (req.method === 'POST') return send({ id: nextId++, lotId: Number(m[1]), ...body }, 201)
      return send(Number(m[1]) === 11 ? [{ id: 1, lotId: 11, lotCode: 'A-2026-01', quantityKg: 10, reason: 'ROT', notes: 'Wet corner of the store', recordedAt: '2026-10-29', createdAt: '2026-10-29T10:00:00Z' }] : [])
    }
    if ((m = /^\/api\/lots\/(\d+)\/close$/.exec(path))) return fail(404, 'No such endpoint')
    if ((m = /^\/api\/lots\/(\d+)$/.exec(path))) return lotById(m[1]) ? send(lotById(m[1])) : fail(404, 'Lot not found')

    if (path === '/api/deliveries' && req.method === 'POST') {
      if (config.deliveryPostFail > 0) { config.deliveryPostFail--; return fail(503, 'Server busy') }
      const g = grades.find((x) => x.id === body.gradeId)
      const d = delivery({ id: nextId++, receiptCode: `RCT-0${nextId}`, memberId: body.memberId, gradeId: g.id, quantityKg: body.quantityKg, deliveredAt: new Date().toISOString(),
        confirmationStatus: 'PENDING', confirmationMethod: null, confirmationLabel: null, confirmedAt: null, lots: [] })
      deliveries.push(d)
      return send(d, 201)
    }
    if (path === '/api/deliveries') {
      let list = deliveries.filter((d) => (!q('memberId') || d.memberId === Number(q('memberId')))
        && (!q('lotId') || d.lots.some((p) => p.lotId === Number(q('lotId'))))
        && (!q('confirmationStatus') || d.confirmationStatus === q('confirmationStatus')))
      if (q('from')) list = list.filter((d) => d.deliveredAt.slice(0, 10) >= q('from'))
      // The "All deliveries" filters, like the backend (0b920f2). Only when the request uses them, so
      // older tests keep their order.
      const fullList = ['status', 'search', 'gradeId', 'to', 'includeReversed', 'createdBefore'].some((n) => q(n) !== null)
      if (!fullList) return send(page([...list].reverse()))
      const status = q('status')
      if (status && !['PENDING', 'CONFIRMED', 'DISPUTED', 'REVERSED'].includes(status)) return fail(400, 'Unknown status')
      if (status === 'REVERSED') list = list.filter((d) => d.reversed)
      else if (status) list = list.filter((d) => !d.reversed && d.confirmationStatus === status)
      else if (q('includeReversed') !== 'true') list = list.filter((d) => !d.reversed)
      if (q('gradeId')) list = list.filter((d) => d.gradeId === Number(q('gradeId')))
      if (q('to')) list = list.filter((d) => d.deliveredAt.slice(0, 10) <= q('to'))
      // createdAt is syncedAt in the response; strictly before.
      if (q('createdBefore')) list = list.filter((d) => Date.parse(d.syncedAt) < Date.parse(q('createdBefore')))
      const term = (q('search') ?? '').trim().toLowerCase()
      if (term) list = list.filter((d) => [d.memberName, d.memberNumber, d.receiptCode].some((v) => v.toLowerCase().includes(term)))
      list = [...list].sort((a, b) => b.deliveredAt.localeCompare(a.deliveredAt) || b.id - a.id)
      const size = Number(q('size') ?? 20)
      const pageNo = Number(q('page') ?? 0)
      return send({ content: list.slice(pageNo * size, pageNo * size + size), page: pageNo, size, totalElements: list.length, totalPages: Math.ceil(list.length / size) })
    }
    if ((m = /^\/api\/deliveries\/(\d+)$/.exec(path))) {
      const d = deliveries.find((x) => x.id === Number(m[1])) ?? (Number(m[1]) === 9 ? disputedInLots : null)
      return d ? send(d) : fail(404, 'Delivery not found')
    }

    if (path === '/api/dashboard') return send({
      totalMembers: 2, activeMembers: 2, membersJoinedThisMonth: 0, stockKg: 442, stockByGrade: [{ gradeName: 'Grade A', kg: 362 }, { gradeName: 'Grade B', kg: 80 }],
      deliveriesTodayKg: 67, deliveriesTodayCount: 2, openLots: [{ id: 12, code: 'A-2026-02', gradeName: 'Grade A' }], owedToMembersRwf: 15488, membersAwaitingPayment: 2,
      lotsReadyToShare: 0, lotsReadyToSell: 2, weeklyDeliveries: [], disputedDeliveries: deliveries.filter((d) => !d.reversed && d.confirmationStatus === 'DISPUTED').length, pendingConfirmationsOver48h: deliveries.filter((d) => !d.reversed && d.confirmationStatus === 'PENDING' && Date.parse(d.syncedAt) < Date.now() - 48 * 3600 * 1000).length, sellableKg: 442, waitingKg: 25, disputedKg: 15,
      gradesWithSellableKg: 2, stockByGradeDetail: [{ gradeName: 'Grade A', remainingKg: 362, sellableKg: 362, waitingKg: 25, disputedKg: 15 }, { gradeName: 'Grade B', remainingKg: 80, sellableKg: 80, waitingKg: 0, disputedKg: 0 }],
      lotsBeingFilled: config.lotsBeingFilled ?? [{ id: 12, code: 'A-2026-02', gradeName: 'Grade A', filledKg: 72, capacityKg: 100 }],
    })

    if ((m = /^\/api\/grades\/(\d+)\/sale-preview$/.exec(path))) {
      if (q('skip') || q('skipLots')) return fail(400, NO_SKIPPING)
      const gradeId = Number(m[1])
      const quantity = Number(q('quantityKg'))
      const price = Number(q('pricePerKg'))
      const p = plan(gradeId, quantity, price)
      const gross = p.lines.reduce((a, l) => a + l.grossRwf, 0)
      const deduction = p.lines.reduce((a, l) => a + l.deductionRwf, 0)
      return send({
        gradeId, gradeName: grades.find((g) => g.id === gradeId).name, quantityKg: quantity, pricePerKg: price, belowFloorPrice: false, deductionPerKg: settings.deductionPerKg,
        sellableKg: p.sellable, waitingConfirmationKg: 25, disputedKg: 15, enough: p.enough,
        message: p.enough ? null : `Only ${p.sellable} kg of Grade A can be sold now, but ${quantity} kg were asked for. 25 kg are waiting for their members to confirm them.`,
        totalAmountRwf: p.enough ? gross : 0, totalDeductionRwf: p.enough ? deduction : 0, totalNetRwf: p.enough ? gross - deduction : 0,
        batches: p.enough ? p.lines : [],
      })
    }
    if (path === '/api/buyer-payments') {
      const list = buyerPayments.filter((b) => !q('buyerId') || b.buyerId === Number(q('buyerId')))
      const size = Number(q('size') ?? 20), pageNo = Number(q('page') ?? 0)
      return send({ content: list.slice(pageNo * size, pageNo * size + size), page: pageNo, size, totalElements: list.length, totalPages: Math.ceil(list.length / size) })
    }
    if ((m = /^\/api\/buyer-payments\/(\d+)$/.exec(path))) {
      const one = buyerPayments.find((b) => b.orderId === Number(m[1]))
      return one ? send(one) : fail(404, `Buyer payment ${m[1]} does not exist.`)
    }
    if ((m = /^\/api\/sales\/(\d+)$/.exec(path)) && req.method === 'GET') {
      const one = salesById[Number(m[1])]
      return one ? send(one) : fail(404, `Sale ${m[1]} does not exist.`)
    }
    if (path === '/api/sales/summary') return send({ salesAmountThisMonth: 15750, soldKgThisMonth: 52.5, buyersThisMonth: 1, averagePricePerKg: 300 })
    if (path === '/api/sales' && req.method === 'GET') return send(page([oldSale]))
    if (path === '/api/sales' && req.method === 'POST') {
      const queued = config.saleErrors.shift()
      if (queued) return fail(queued.status, queued.message)
      if (asksSkip(body)) return fail(400, NO_SKIPPING)
      if (paymentRefusal(body)) return fail(paymentRefusal(body).status, paymentRefusal(body).message)
      const p = plan(body.gradeId, Number(body.quantityKg), body.pricePerKg)
      if (!p.enough) return fail(400, `Only ${p.sellable} kg of Grade A can be sold now, but ${body.quantityKg} kg were asked for.`)
      const batches = p.lines.map(({ takeKg, remainingAfterKg, deliveredAt, lotPortionId, ...line }) => line)
      const total = batches.reduce((a, l) => a + l.grossRwf, 0)
      const deduction = batches.reduce((a, l) => a + l.deductionRwf, 0)
      const sale = { ...oldSale, id: nextId++, saleCode: `SAL-NEW${saleNumber++}`, gradeId: body.gradeId, quantityKg: Number(body.quantityKg), pricePerKg: body.pricePerKg,
        totalAmountRwf: total, totalDeductionRwf: deduction, totalNetRwf: total - deduction, soldAt: body.soldAt, batches }
      recordBuyerPayment(body, [sale])
      return send(sale, 201)
    }

    if (path === '/api/sales/orders' && req.method === 'POST') {
      const queued = config.saleErrors.shift()
      if (queued) return fail(queued.status, queued.message)
      if (asksSkip(body) || body.items.some(asksSkip)) return fail(400, NO_SKIPPING)
      if (paymentRefusal(body)) return fail(paymentRefusal(body).status, paymentRefusal(body).message)
      const sales = []
      for (const item of body.items) {
        const p = plan(item.gradeId, Number(item.quantityKg), item.pricePerKg)
        if (!p.enough) return fail(400, `Only ${p.sellable} kg can be sold now, but ${item.quantityKg} kg were asked for.`)
        const batches = p.lines.map(({ takeKg, remainingAfterKg, deliveredAt, lotPortionId, ...line }) => line)
        const total = batches.reduce((a, l) => a + l.grossRwf, 0)
        const deduction = batches.reduce((a, l) => a + l.deductionRwf, 0)
        sales.push({ ...oldSale, id: nextId++, saleCode: `SAL-NEW${saleNumber++}`, gradeId: item.gradeId, gradeName: grades.find((g) => g.id === item.gradeId).name, quantityKg: Number(item.quantityKg), pricePerKg: item.pricePerKg,
          totalAmountRwf: total, totalDeductionRwf: deduction, totalNetRwf: total - deduction, soldAt: body.soldAt, batches })
      }
      recordBuyerPayment(body, sales)
      return send({ id: nextId++, orderCode: 'ORD-NEW1', buyer: { id: body.buyerId, name: 'Musanze Market Ltd' }, soldAt: body.soldAt,
        totalKg: sales.reduce((a, x) => a + x.quantityKg, 0), totalAmountRwf: sales.reduce((a, x) => a + x.totalAmountRwf, 0), sales }, 201)
    }

    if (path === '/api/disputes') {
      const open = q('status') !== 'settled'
      const items = (open ? [deliveries.find((d) => d.id === 8), disputedInLots] : []).map((d) => ({
        deliveryId: d.id, receiptCode: d.receiptCode, memberId: d.memberId, memberName: d.memberName, memberNumber: d.memberNumber, gradeName: d.gradeName,
        lotCode: d.lotCode, quantityKg: d.quantityKg, reason: d.disputeReason, note: d.disputeNote, disputedAt: d.disputedAt, daysOpen: 4, open: true, outcome: null,
        settledAt: null, resolutionNote: null, correctedById: null, lots: d.lots,
      }))
      return send({ openDisputes: 2, openKg: 45, settledDisputes: 0, disputes: page(items) })
    }
    if (path === '/api/ledger/summary') return send({ totalEntries: ledger.length, lastEntryAt: ledger.at(-1).entryDate, entriesToday: 0 })
    if (path === '/api/ledger/verify') return send({ valid: true, checkedEntries: ledger.length, firstBrokenEntryId: null })
    if (path === '/api/ledger') return send(page([...ledger].reverse()))

    // As the backend: built from the settings (PublicInfoResponse.from(Setting)).
    if (path === '/api/public/info') return send({ cooperativeName: settings.cooperativeName, location: settings.location, cooperativeEmail: settings.cooperativeEmail, minOrderKg: settings.minOrderKg, cooperativePhone: settings.cooperativePhone })
    if (path === '/api/public/grades') return send([])
    missing.push(`${req.method} ${path}${url.search}`)
    fail(404, 'not mocked: ' + path)
  }
}).listen(4199, () => console.log('mock-lots on 4199'))
