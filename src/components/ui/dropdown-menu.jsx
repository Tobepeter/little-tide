import React from 'react';
import { DropdownMenu as Primitive } from 'radix-ui';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
export const DropdownMenu=Primitive.Root;
export const DropdownMenuTrigger=Primitive.Trigger;
export function DropdownMenuContent({className,sideOffset=4,...props}){return <Primitive.Portal><Primitive.Content data-slot="dropdown-menu-content" sideOffset={sideOffset} className={cn('bg-popover text-popover-foreground z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] overflow-y-auto rounded-md border p-1 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)',className)} {...props}/></Primitive.Portal>}
const itemStyle='focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0';
export function DropdownMenuItem({className,...props}){return <Primitive.Item data-slot="dropdown-menu-item" className={cn(itemStyle,className)} {...props}/>}
export function DropdownMenuCheckboxItem({className,children,checked,...props}){return <Primitive.CheckboxItem data-slot="dropdown-menu-checkbox-item" checked={checked} className={cn(itemStyle,'pl-8',className)} {...props}><span className="absolute left-2 flex size-3.5 items-center justify-center"><Primitive.ItemIndicator><Check className="size-4"/></Primitive.ItemIndicator></span>{children}</Primitive.CheckboxItem>}
export function DropdownMenuSeparator({className,...props}){return <Primitive.Separator data-slot="dropdown-menu-separator" className={cn('bg-border -mx-1 my-1 h-px',className)} {...props}/>}
