import React from 'react';
import { ToggleGroup as Primitive } from 'radix-ui';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
const styles=cva('inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium hover:bg-muted hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:size-4 shrink-0 outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',{variants:{variant:{default:'bg-transparent',outline:'border border-input bg-transparent shadow-xs hover:bg-accent'},size:{default:'h-9 px-2 min-w-9',sm:'h-8 px-1.5 min-w-8',lg:'h-10 px-2.5 min-w-10'}},defaultVariants:{variant:'default',size:'default'}});
const Context=React.createContext({size:'default',variant:'default'});
export function ToggleGroup({className,variant,size,children,...props}){return <Primitive.Root data-slot="toggle-group" className={cn('flex w-fit items-center rounded-md gap-1',className)} {...props}><Context.Provider value={{variant,size}}>{children}</Context.Provider></Primitive.Root>}
export function ToggleGroupItem({className,variant,size,...props}){const context=React.useContext(Context);return <Primitive.Item data-slot="toggle-group-item" className={cn(styles({variant:context.variant||variant,size:context.size||size}),className)} {...props}/>}
