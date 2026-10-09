import React from 'react';
import { AlertDialog as Primitive } from 'radix-ui';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
export const AlertDialog=Primitive.Root;
export function AlertDialogContent({className,...props}){return <Primitive.Portal><Primitive.Overlay data-slot="alert-dialog-overlay" className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"/><Primitive.Content data-slot="alert-dialog-content" className={cn('bg-background fixed top-[50%] left-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',className)} {...props}/></Primitive.Portal>}
export function AlertDialogHeader({className,...props}){return <div data-slot="alert-dialog-header" className={cn('flex flex-col gap-2',className)} {...props}/>}
export function AlertDialogFooter({className,...props}){return <div data-slot="alert-dialog-footer" className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',className)} {...props}/>}
export function AlertDialogTitle({className,...props}){return <Primitive.Title data-slot="alert-dialog-title" className={cn('text-base font-semibold',className)} {...props}/>}
export function AlertDialogDescription({className,...props}){return <Primitive.Description data-slot="alert-dialog-description" className={cn('text-muted-foreground text-sm',className)} {...props}/>}
export function AlertDialogAction({className,...props}){return <Primitive.Action className={cn(buttonVariants(),className)} {...props}/>}
export function AlertDialogCancel({className,...props}){return <Primitive.Cancel className={cn(buttonVariants({variant:'outline'}),className)} {...props}/>}
