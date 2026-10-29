import { forwardRef,type ComponentPropsWithoutRef,type ElementRef } from 'react';
import * as Primitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
const DialogContent=forwardRef<ElementRef<typeof Primitive.Content>,ComponentPropsWithoutRef<typeof Primitive.Content>>(({children,className='',...props},ref)=><Primitive.Portal><Primitive.Overlay className="fixed inset-0 z-[80] bg-background/75 backdrop-blur-sm"/><Primitive.Content ref={ref} className={`fixed left-1/2 top-1/2 z-[90] w-[calc(100%_-_32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 solid-panel p-6 shadow-2xl grid gap-4 ${className}`} {...props}>{children}<Primitive.Close className="absolute right-3 top-3 flex items-center justify-center w-11 h-11 text-muted" aria-label="Close dialog"><X size={19}/></Primitive.Close></Primitive.Content></Primitive.Portal>);
DialogContent.displayName='DialogContent';
export default DialogContent;
