import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DialogOverlay } from "./dialog";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    side?: "right" | "left";
  }
>(({ className, children, side = "right", ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed top-0 z-50 flex h-full w-[min(720px,100vw)] flex-col border-line-2 bg-panel shadow-[0_24px_80px_rgba(0,0,0,0.6)]",
        side === "right"
          ? "right-0 border-l data-[state=open]:animate-[sheet-in-right_260ms_var(--ease-out)]"
          : "left-0 border-r data-[state=open]:animate-[sheet-in-left_260ms_var(--ease-out)]",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="icon-btn absolute right-3 top-3 z-10">
        <X className="h-4 w-4" />
        <span className="sr">Fechar</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = DialogPrimitive.Content.displayName;

export function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("shrink-0 border-b border-line px-5 py-4 pr-12", className)}
      {...props}
    />
  );
}

export function SheetBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto p-5", className)} {...props} />
  );
}

export { DialogTitle as SheetTitle, DialogDescription as SheetDescription } from "./dialog";
