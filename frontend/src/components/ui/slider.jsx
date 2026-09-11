import React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

export function Slider({ className = '', ...props }) {
  return (
    <SliderPrimitive.Root className={`shadcn-slider ${className}`} {...props}>
      <SliderPrimitive.Track className="shadcn-slider-track">
        <SliderPrimitive.Range className="shadcn-slider-range" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="shadcn-slider-thumb" />
    </SliderPrimitive.Root>
  );
}
