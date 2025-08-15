import * as React from "react"
import { cn } from "@/lib/utils"

const RadioGroup = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      className={cn("grid gap-2", className)}
      {...props}
      ref={ref}
      role="radiogroup"
    />
  )
})
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div className="flex items-center space-x-2">
      <input
        type="radio"
        className={cn(
          "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
      {children}
    </div>
  )
})
RadioGroupItem.displayName = "RadioGroupItem"

const RadioGroupIndicator = ({ className, ...props }) => (
  <div
    className={cn(
      "flex items-center justify-center",
      className
    )}
    {...props}
  >
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-2.5 w-2.5 fill-current text-current"
    >
      <circle cx="7.5" cy="7.5" r="3.75" fill="currentColor" />
    </svg>
  </div>
)
RadioGroupIndicator.displayName = "RadioGroupIndicator"

export { RadioGroup, RadioGroupItem, RadioGroupIndicator }