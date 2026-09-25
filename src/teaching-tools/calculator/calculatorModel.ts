export interface CalculatorState { display: string; previous: number | null; operator: string | null; fresh: boolean; }
export const initialCalculator: CalculatorState = { display: '0', previous: null, operator: null, fresh: true };
const format = (n: number) => Number.isFinite(n) ? String(Number(n.toPrecision(12))) : 'Error';
const calculate = (a: number, b: number, op: string) => op === '+' ? a + b : op === '-' ? a - b : op === '×' ? a * b : b === 0 ? NaN : a / b;

export function calculatorKey(state: CalculatorState, key: string): CalculatorState {
  if (key === 'AC') return { ...initialCalculator };
  if (/^[0-9.]$/.test(key)) {
    const start = state.fresh || state.display === 'Error';
    if (key === '.' && !start && state.display.includes('.')) return state;
    const display = start ? (key === '.' ? '0.' : key) : state.display === '0' && key !== '.' ? key : state.display + key;
    if (display.length > 16) return state;
    return { ...(state.display === 'Error' ? initialCalculator : state), display, fresh: false };
  }
  if (state.display === 'Error') return state;
  const current = Number(state.display);
  if (key === '±') return { ...state, display: format(-current) };
  if (key === '√' || key === '%') return { ...state, display: format(key === '√' ? Math.sqrt(current) : current / 100), fresh: true };
  if (key === '=') {
    if (state.previous === null || !state.operator) return state;
    return { display: format(calculate(state.previous, current, state.operator)), previous: null, operator: null, fresh: true };
  }
  if (['+', '-', '×', '÷'].includes(key)) {
    const next = state.previous !== null && state.operator && !state.fresh ? calculate(state.previous, current, state.operator) : current;
    if (!Number.isFinite(next)) return { ...initialCalculator, display: 'Error' };
    return { display: format(next), previous: state.fresh && state.previous !== null ? state.previous : next, operator: key, fresh: true };
  }
  return state;
}
