import React from 'react';
import { Popover as Primitive } from 'radix-ui';
import { cn } from '@/lib/utils';
export const Popover=Primitive.Root;
export const PopoverTrigger=Primitive.Trigger;
export const PopoverAnchor=Primitive.Anchor;
export function PopoverContent({className,align='center',sideOffset=4,...props}){return <Primitive.Portal><Primitive.Content data-slot="popover-content" align={align} sideOffset={sideOffset} className={cn('bg-popover text-popover-foreground z-50 w-72 rounded-md border p-4 shadow-md outline-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-popover-content-transform-origin)',className)} {...props}/></Primitive.Portal>}
