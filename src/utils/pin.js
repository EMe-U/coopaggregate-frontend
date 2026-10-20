export const PIN_LENGTH = 4

// The same rule as the backend: no 4 equal digits and no digits in a row (1234, 4321).
// Checked here too so the member hears about it before the PIN is sent.
export function isTrivialPin(pin) {
  const steps = [...pin].slice(1).map((digit, index) => Number(digit) - Number(pin[index]))
  return steps.every((step) => step === 0) || steps.every((step) => step === 1) || steps.every((step) => step === -1)
}
