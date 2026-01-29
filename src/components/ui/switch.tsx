'use client';

import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';

import { cn } from '@/lib/utils';

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer cursor-pointer data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-300 hover:data-[state=unchecked]:bg-gray-400 focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'bg-white pointer-events-none block size-5 rounded-full shadow-md ring-0 transition-transform',
          'data-[state=unchecked]:translate-x-0.5',
          'ltr:data-[state=checked]:translate-x-[calc(100%-2px)]',
          'rtl:data-[state=checked]:-translate-x-[calc(100%-2px)]'
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
