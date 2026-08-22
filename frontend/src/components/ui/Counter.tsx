interface CounterProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function Counter({ value, onChange, min = 0, max = 99 }: CounterProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold transition-all active:scale-90 disabled:opacity-30"
        style={{ backgroundColor: '#22252F', border: '1px solid #2A2D37', color: '#F87171' }}
      >
        −
      </button>
      <span className="w-8 text-center text-xl font-bold text-white tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold transition-all active:scale-90 disabled:opacity-30"
        style={{ backgroundColor: '#22252F', border: '1px solid #2A2D37', color: '#4ADE80' }}
      >
        +
      </button>
    </div>
  );
}
