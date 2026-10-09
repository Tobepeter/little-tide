import React from 'react';
import { Switch as Primitive } from 'radix-ui';
import { cn } from '@/lib/utils';

export function Switch({className,...props}) {
  return <Primitive.Root data-slot="switch" className={cn('switch-control',className)} {...props}><Primitive.Thumb data-slot="switch-thumb" className="switch-thumb"/></Primitive.Root>;
}
