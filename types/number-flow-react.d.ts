declare module '@number-flow/react' {
  import type { ComponentType, HTMLAttributes } from 'react';

  export type NumberFlowProps = {
    value: number;
    format?: Intl.NumberFormatOptions;
    locales?: Intl.LocalesArgument;
    prefix?: string;
    suffix?: string;
    transformTiming?: EffectTiming;
    spinTiming?: EffectTiming;
    opacityTiming?: EffectTiming;
    trend?: (oldValue: number, value: number) => number;
    isolate?: boolean;
    animated?: boolean;
    digits?: Record<number, { max?: number }>;
    respectMotionPreference?: boolean;
    plugins?: unknown[];
    willChange?: boolean;
    onAnimationsStart?: (event: CustomEvent) => void;
    onAnimationsFinish?: (event: CustomEvent) => void;
  } & HTMLAttributes<HTMLSpanElement>;

  const NumberFlow: ComponentType<NumberFlowProps>;

  export default NumberFlow;
}
