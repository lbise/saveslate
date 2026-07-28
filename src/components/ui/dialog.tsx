/* Hallmark · pre-emit critique: P4 H4 E4 S4 R4 V3 */
/* Hallmark · component: dialog · genre: modern-minimal · theme: SaveSlate */
import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-background/80 backdrop-blur-xs motion-reduce:animate-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed bottom-0 left-[50%] z-50 flex max-h-[calc(100dvh-0.5rem)] w-full max-w-[calc(100%-0.5rem)] translate-x-[-50%] flex-col overflow-hidden rounded-t-xl border border-border bg-card shadow-lg outline-none motion-reduce:animate-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4 sm:top-[50%] sm:bottom-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-lg sm:translate-y-[-50%] sm:rounded-xl sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
          className
        )}
        {...props}
      >
        <div
          data-slot="dialog-scroll"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 [&_button]:min-h-11 [&_[data-slot=input]]:h-11 [&_[data-slot=select-trigger]]:h-11 sm:p-6 sm:[&_button]:min-h-0 sm:[&_[data-slot=input]]:h-10 sm:[&_[data-slot=select-trigger]]:h-10"
        >
          {children}
        </div>
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-2.5 right-2.5 flex size-11 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 active:bg-secondary focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 sm:top-3.5 sm:right-3.5 sm:size-9 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "sticky top-0 z-10 -mx-5 -mt-5 mb-5 flex flex-col gap-1.5 border-b border-border-subtle bg-card/95 px-5 py-4 pr-14 text-left backdrop-blur-sm sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-5 sm:pr-16",
        className
      )}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "sticky bottom-0 z-10 -mx-5 -mb-5 mt-5 grid grid-cols-2 gap-2 border-t border-border-subtle bg-card/95 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:-mx-6 sm:-mb-6 sm:flex sm:justify-end sm:px-6 sm:py-4 [&>button]:h-11 [&>button]:w-full [&>button:only-child]:col-span-2 sm:[&>button]:h-9 sm:[&>button]:w-auto",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "min-w-0 font-display text-lg font-semibold leading-tight text-foreground [overflow-wrap:anywhere]",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm leading-5 text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
