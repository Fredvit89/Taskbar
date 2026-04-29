import { Slider } from "@/components/ui/slider";

interface CaliberPickerProps {
  min?: number;
  max?: number;
  onChange: (next: { min: number; max: number }) => void;
  id?: string;
}

const RANGE_MIN = 55;
const RANGE_MAX = 100;
const STEP = 5;

export const CaliberPicker = ({ min, max, onChange, id }: CaliberPickerProps) => {
  const lo = typeof min === "number" ? min : RANGE_MIN;
  const hi = typeof max === "number" ? max : RANGE_MAX;

  const handleChange = (vals: number[]) => {
    const [a, b] = vals;
    onChange({ min: Math.min(a, b), max: Math.max(a, b) });
  };

  const ticks: number[] = [];
  for (let v = RANGE_MIN; v <= RANGE_MAX; v += STEP) ticks.push(v);

  return (
    <div id={id} className="space-y-2 rounded-md border bg-background px-3 py-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Zakres</span>
        <span className="font-semibold tabular-nums">
          {lo} – {hi} mm
        </span>
      </div>
      <Slider
        min={RANGE_MIN}
        max={RANGE_MAX}
        step={STEP}
        value={[lo, hi]}
        onValueChange={handleChange}
        className="py-1"
      />
      <div className="flex justify-between px-0.5 text-[10px] text-muted-foreground tabular-nums">
        {ticks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  );
};
