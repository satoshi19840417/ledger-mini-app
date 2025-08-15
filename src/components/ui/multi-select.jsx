import * as React from "react";
import { cn } from "@/lib/utils";

const MultiSelect = React.forwardRef(({ className, children, ...props }, ref) => (
  <select
    multiple
    className={cn(
      "flex min-h-[2.5rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  >
    {children}
  </select>
));
MultiSelect.displayName = "MultiSelect";

const MultiSelectItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <option
    ref={ref}
    className={cn(
      "cursor-default select-none py-1.5 pl-2 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground",
      className
    )}
    {...props}
  >
    {children}
  </option>
));
MultiSelectItem.displayName = "MultiSelectItem";

export { MultiSelect, MultiSelectItem };
