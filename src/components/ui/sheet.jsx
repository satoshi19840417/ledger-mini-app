import * as React from "react"
import { cn } from "@/lib/utils"

const SheetContext = React.createContext({})

const Sheet = ({ children, open, onOpenChange }) => {
  React.useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : 'unset'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  )
}

const SheetContent = React.forwardRef(({ className, side = "right", children, ...props }, ref) => {
  const { open, onOpenChange } = React.useContext(SheetContext)

  const sideClasses = {
    top: "top-0 left-0 right-0 h-auto max-h-[85vh] translate-y-[-100%] data-[state=open]:translate-y-0",
    bottom: "bottom-0 left-0 right-0 h-auto max-h-[85vh] translate-y-full data-[state=open]:translate-y-0",
    left: "left-0 top-0 h-full w-3/4 max-w-sm translate-x-[-100%] data-[state=open]:translate-x-0",
    right: "right-0 top-0 h-full w-3/4 max-w-sm translate-x-full data-[state=open]:translate-x-0"
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        className="fixed inset-0"
        onClick={() => onOpenChange?.(false)}
        style={{ pointerEvents: 'auto' }}
      />
      <div style={{ pointerEvents: 'auto' }}>
        <div
          ref={ref}
          className={cn(
            "fixed bg-white p-6 shadow-2xl transition-transform duration-300 ease-in-out border-l",
            "data-[state=open]:translate-x-0 data-[state=open]:translate-y-0",
            sideClasses[side],
            className
          )}
          style={{ backgroundColor: 'white', color: '#1f2937' }}
          data-state={open ? "open" : "closed"}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          {children}
        </div>
      </div>
    </div>
  )
})
SheetContent.displayName = "SheetContent"

const SheetHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
    {...props}
  />
))
SheetHeader.displayName = "SheetHeader"

const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
))
SheetTitle.displayName = "SheetTitle"

const SheetDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
SheetDescription.displayName = "SheetDescription"

const SheetTrigger = React.forwardRef(({ className, asChild, children, ...props }, ref) => {
  const { onOpenChange } = React.useContext(SheetContext)

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref,
      onClick: (e) => {
        children.props.onClick?.(e)
        onOpenChange?.(true)
      },
      ...props,
    })
  }

  return (
    <button
      ref={ref}
      className={cn(className)}
      onClick={() => onOpenChange?.(true)}
      {...props}
    >
      {children}
    </button>
  )
})
SheetTrigger.displayName = "SheetTrigger"

export {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
}
