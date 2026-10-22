// Preview only, so the manager can tell the member before saving. The saved deduction is
// calculated by the backend from the deduction set in Settings, and that is what the receipt
// shows once the delivery is saved. Keep this in step with that setting until the frontend can
// read it from the API.
export const DEDUCTION_PER_KG_PREVIEW = 5

export function previewDeduction(quantityKg) {
  return Math.round(quantityKg * DEDUCTION_PER_KG_PREVIEW)
}
