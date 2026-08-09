import React, { useState } from 'react';
import { Calculator as CalcIcon } from 'lucide-react';
import { DraggableOverlay } from '../components/DraggableOverlay';
import { TeachingToolRegistry } from '../TeachingToolRegistry';

export const CalculatorTool: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [newNumber, setNewNumber] = useState(true);
  const [lastOperator, setLastOperator] = useState<string | null>(null);
  const [prevValue, setPrevValue] = useState<number | null>(null);

  const handleNum = (num: string) => {
    if (newNumber) {
      setDisplay(num);
      setNewNumber(false);
    } else {
      setDisplay(display === '0' && num !== '.' ? num : display + num);
    }
  };

  const calculate = (a: number, b: number, op: string) => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '×': return a * b;
      case '÷': return b !== 0 ? a / b : NaN;
      default: return b;
    }
  };

  const handleOp = (op: string) => {
    const current = parseFloat(display);
    
    if (prevValue === null) {
      setPrevValue(current);
      setEquation(`${current} ${op}`);
    } else if (lastOperator) {
      const result = calculate(prevValue, current, lastOperator);
      setDisplay(String(result));
      setPrevValue(result);
      setEquation(`${result} ${op}`);
    }
    
    setLastOperator(op);
    setNewNumber(true);
  };

  const handleEqual = () => {
    if (prevValue !== null && lastOperator) {
      const current = parseFloat(display);
      const result = calculate(prevValue, current, lastOperator);
      setDisplay(String(result));
      setEquation('');
      setPrevValue(null);
      setLastOperator(null);
      setNewNumber(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setPrevValue(null);
    setLastOperator(null);
    setNewNumber(true);
  };

  const handleSqrt = () => {
    const current = parseFloat(display);
    setDisplay(String(Math.sqrt(current)));
    setNewNumber(true);
  };

  const handlePercent = () => {
    const current = parseFloat(display);
    setDisplay(String(current / 100));
    setNewNumber(true);
  };

  const btnClass = "p-4 sm:p-5 text-2xl font-medium rounded-2xl transition-all duration-200 active:scale-95 select-none touch-manipulation";
  const numClass = `${btnClass} bg-slate-700/50 hover:bg-slate-700 text-slate-100`;
  const opClass = `${btnClass} bg-indigo-500 hover:bg-indigo-400 text-white`;
  const funcClass = `${btnClass} bg-slate-600 hover:bg-slate-500 text-slate-200`;

  return (
    <DraggableOverlay toolId="calculator" title="Calculator">
      <div className="w-[320px] sm:w-[380px] flex flex-col gap-4">
        {/* Display */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-right h-28 flex flex-col justify-end">
          <div className="text-slate-500 text-lg h-7 font-mono">{equation}</div>
          <div className="text-5xl font-semibold text-white tracking-tight overflow-hidden text-ellipsis whitespace-nowrap font-mono">{display}</div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-4 gap-3">
          <button className={funcClass} onClick={handleClear}>AC</button>
          <button className={funcClass} onClick={() => setDisplay(display.startsWith('-') ? display.slice(1) : '-' + display)}>±</button>
          <button className={funcClass} onClick={handlePercent}>%</button>
          <button className={opClass} onClick={() => handleOp('÷')}>÷</button>

          <button className={funcClass} onClick={handleSqrt}>√</button>
          <button className={numClass} onClick={() => handleNum('7')}>7</button>
          <button className={numClass} onClick={() => handleNum('8')}>8</button>
          <button className={numClass} onClick={() => handleNum('9')}>9</button>
          <button className={opClass} onClick={() => handleOp('×')}>×</button>

          <button className={numClass} onClick={() => handleNum('4')}>4</button>
          <button className={numClass} onClick={() => handleNum('5')}>5</button>
          <button className={numClass} onClick={() => handleNum('6')}>6</button>
          <button className={opClass} onClick={() => handleOp('-')}>−</button>

          <button className={numClass} onClick={() => handleNum('1')}>1</button>
          <button className={numClass} onClick={() => handleNum('2')}>2</button>
          <button className={numClass} onClick={() => handleNum('3')}>3</button>
          <button className={opClass} onClick={() => handleOp('+')}>+</button>

          <button className={`${numClass} col-span-2`} onClick={() => handleNum('0')}>0</button>
          <button className={numClass} onClick={() => handleNum('.')}>.</button>
          <button className={opClass} onClick={handleEqual}>=</button>
        </div>
      </div>
    </DraggableOverlay>
  );
};

export const registerCalculator = () => {
  TeachingToolRegistry.register({
    id: 'calculator',
    name: 'Calculator',
    icon: CalcIcon,
    category: 'MATHEMATICS',
    type: 'overlay-ui',
    description: 'A floating calculator for the classroom.',
    component: CalculatorTool,
  });
};
