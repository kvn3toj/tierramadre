/**
 * LogRangeSlider Component
 * Dual-thumb range slider whose drag position maps to a logarithmic scale.
 *
 * Use for ranges spanning multiple orders of magnitude (e.g. emerald prices
 * from a few thousand to hundreds of millions of COP), where a linear slider
 * compresses the entire low end of the range into a sliver of the track,
 * making it nearly impossible to select precisely.
 */

import { useCallback, useMemo } from 'react';
import type { SyntheticEvent } from 'react';
import { Slider } from '@mui/material';
import type { SliderProps } from '@mui/material';

const RESOLUTION = 1000;

/** Guards against log(0)/log(negative) when the real domain touches zero. */
function safeMin(min: number, max: number): number {
  if (min > 0) return min;
  const positiveMax = max > 0 ? max : 1;
  return Math.max(positiveMax * 1e-6, 1e-6);
}

function toInternal(value: number, min: number, max: number): number {
  const lo = safeMin(min, max);
  if (max <= lo) return 0;
  const clamped = Math.min(Math.max(value, lo), max);
  const t = (Math.log(clamped) - Math.log(lo)) / (Math.log(max) - Math.log(lo));
  return Math.round(t * RESOLUTION);
}

function fromInternal(
  internal: number,
  min: number,
  max: number,
  roundTo: number,
): number {
  const lo = safeMin(min, max);
  if (max <= lo) return min;
  const t = Math.min(Math.max(internal, 0), RESOLUTION) / RESOLUTION;
  const raw = Math.exp(Math.log(lo) + t * (Math.log(max) - Math.log(lo)));
  const rounded = roundTo > 0 ? Math.round(raw / roundTo) * roundTo : raw;
  return Math.min(Math.max(rounded, min), max);
}

export interface LogRangeSliderProps extends Omit<
  SliderProps,
  | 'value'
  | 'min'
  | 'max'
  | 'onChange'
  | 'onChangeCommitted'
  | 'step'
  | 'scale'
  | 'defaultValue'
> {
  value: [number, number];
  min: number;
  max: number;
  onChange: (value: [number, number]) => void;
  onChangeCommitted?: (value: [number, number]) => void;
  /** Round the emitted real-world value to the nearest multiple of this (e.g. 1000 for COP, 0.1 for carats). */
  roundTo?: number;
}

export function LogRangeSlider({
  value,
  min,
  max,
  onChange,
  onChangeCommitted,
  roundTo = 1,
  valueLabelFormat,
  getAriaValueText,
  ...sliderProps
}: LogRangeSliderProps) {
  const internalValue = useMemo<[number, number]>(
    () => [toInternal(value[0], min, max), toInternal(value[1], min, max)],
    [value, min, max],
  );

  const handleChange = useCallback(
    (_event: Event, newValue: number | number[]) => {
      const [a, b] = newValue as number[];
      onChange([
        fromInternal(a, min, max, roundTo),
        fromInternal(b, min, max, roundTo),
      ]);
    },
    [onChange, min, max, roundTo],
  );

  const handleChangeCommitted = useCallback(
    (_event: Event | SyntheticEvent, newValue: number | number[]) => {
      if (!onChangeCommitted) return;
      const [a, b] = newValue as number[];
      onChangeCommitted([
        fromInternal(a, min, max, roundTo),
        fromInternal(b, min, max, roundTo),
      ]);
    },
    [onChangeCommitted, min, max, roundTo],
  );

  const wrappedValueLabelFormat =
    typeof valueLabelFormat === 'function'
      ? (internal: number, index: number) =>
          valueLabelFormat(fromInternal(internal, min, max, roundTo), index)
      : valueLabelFormat;

  const wrappedGetAriaValueText = getAriaValueText
    ? (internal: number, index: number) =>
        getAriaValueText(fromInternal(internal, min, max, roundTo), index)
    : undefined;

  return (
    <Slider
      {...sliderProps}
      value={internalValue}
      min={0}
      max={RESOLUTION}
      step={1}
      onChange={handleChange}
      onChangeCommitted={handleChangeCommitted}
      valueLabelFormat={wrappedValueLabelFormat}
      getAriaValueText={wrappedGetAriaValueText}
    />
  );
}

export default LogRangeSlider;
