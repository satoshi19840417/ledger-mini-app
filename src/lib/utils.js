import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  if (!inputs.every((input) => typeof input === "string")) {
    return ""
  }

  return twMerge(clsx(...inputs))
}
