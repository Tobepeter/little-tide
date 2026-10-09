import React from 'react';
import { Dialog as Primitive } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
export const Dialog=Primitive.Root;
export const DialogTrigger=Primitive.Trigger;
export const DialogClose=Primitive.Close;
export function DialogContent({className,children,...props}){return <Primitive.Portal><Primitive.Overlay data-slot="dialog-overlay" className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"/><Primitive.Content data-slot="dialog-content" className={cn('bg-background fixed top-[50%] left-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',className)} {...props}>{children}<Primitive.Close className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label="关闭"><X className="size-4"/></Primitive.Close></Primitive.Content></Primitive.Portal>}
export function DialogHeader({className,...props}){return <div data-slot="dialog-header" className={cn('flex flex-col gap-2',className)} {...props}/>}
export function DialogFooter({className,...props}){return <div data-slot="dialog-footer" className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',className)} {...props}/>}
export function DialogTitle({className,...props}){return <Primitive.Title data-slot="dialog-title" className={cn('text-base leading-none font-semibold',className)} {...props}/>}
export function DialogDescription({className,...props}){return <Primitive.Description data-slot="dialog-description" className={cn('text-muted-foreground text-sm',className)} {...props}/>}
