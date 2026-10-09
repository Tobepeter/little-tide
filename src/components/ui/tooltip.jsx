import React from 'react';
import { Tooltip as Primitive } from 'radix-ui';
import { cn } from '@/lib/utils';
export const TooltipProvider=Primitive.Provider;
export const Tooltip=Primitive.Root;
export const TooltipTrigger=Primitive.Trigger;
export function TooltipContent({className,sideOffset=4,children,...props}){return <Primitive.Portal><Primitive.Content data-slot="tooltip-content" sideOffset={sideOffset} className={cn('bg-primary text-primary-foreground z-50 w-fit rounded-md px-3 py-1.5 text-xs text-balance animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',className)} {...props}>{children}</Primitive.Content></Primitive.Portal>}
