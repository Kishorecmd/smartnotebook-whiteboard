import React, { useReducer } from 'react';
import { Calculator as CalcIcon } from 'lucide-react';
import { DraggableOverlay } from '../components/DraggableOverlay';
import { TeachingToolRegistry } from '../TeachingToolRegistry';
import { calculatorKey, initialCalculator } from './calculatorModel';

export const CalculatorTool: React.FC = () => {
  const [state, press] = useReducer(calculatorKey, initialCalculator);
  const display = state.display;
  const equation = state.previous !== null ? state.previous + ' ' + state.operator : '';
  const handleNum = press;
  const handleOp = press;
  const handleEqual = () => press('=');
  const handleClear = () => press('AC');
  const handleSqrt = () => press('√');
  const handlePercent = () => press('%');

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
          <button className={funcClass} onClick={() => press('±')}>±</button>
          <button className={funcClass} onClick={handlePercent}>%</button>
          <button className={funcClass} onClick={handleSqrt}>√</button>
          <button className={numClass} onClick={() => handleNum('7')}>7</button>
          <button className={numClass} onClick={() => handleNum('8')}>8</button>
          <button className={numClass} onClick={() => handleNum('9')}>9</button>
          <button className={opClass} onClick={() => handleOp('÷')}>÷</button>

          <button className={numClass} onClick={() => handleNum('4')}>4</button>
          <button className={numClass} onClick={() => handleNum('5')}>5</button>
          <button className={numClass} onClick={() => handleNum('6')}>6</button>
          <button className={opClass} onClick={() => handleOp('×')}>×</button>

          <button className={numClass} onClick={() => handleNum('1')}>1</button>
          <button className={numClass} onClick={() => handleNum('2')}>2</button>
          <button className={numClass} onClick={() => handleNum('3')}>3</button>
          <button className={opClass} onClick={() => handleOp('-')}>−</button>

          <button className={numClass} onClick={() => handleNum('0')}>0</button>
          <button className={numClass} onClick={() => handleNum('.')}>.</button>
          <button className={opClass} onClick={handleEqual}>=</button>
          <button className={opClass} onClick={() => handleOp('+')}>+</button>
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
