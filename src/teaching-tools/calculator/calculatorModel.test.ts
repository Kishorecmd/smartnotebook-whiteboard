import { describe, it, expect } from 'vitest';
import { calculatorKey, initialCalculator } from './calculatorModel';
const run = (keys: string[]) => keys.reduce(calculatorKey, initialCalculator).display;
describe('classroom calculator', () => {
  it.each([
    [['4','+','5','='], '9'],
    [['9','-','3','='], '6'],
    [['6','×','7','='], '42'],
    [['8','÷','2','='], '4'],
    [['.','5','+','.','2','='], '0.7'],
    [['1','.','.','5'], '1.5'],
    [['2','+','×','3','='], '6'],
    [['2','+','3','×','4','='], '20'],
    [['1','÷','0','='], 'Error'],
    [['9','±','√'], 'Error'],
    [['1','÷','0','=','7'], '7'],
    [['5','0','%'], '0.5'],
    [['9','√'], '3'],
    [['9','+','AC','2'], '2'],
  ])('handles %j as %s', (keys, result) => expect(run(keys)).toBe(result));
});
