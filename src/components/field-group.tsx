import type React from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FieldGroupProps {
  label: string
  htmlFor?: string
  hiddenLabel?: boolean
  required?: boolean
  error?: string
  className?: string
  children: React.ReactNode
}

export function FieldGroup({
  label,
  htmlFor,
  hiddenLabel = false,
  required = false,
  error,
  className,
  children,
}: FieldGroupProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label
        htmlFor={htmlFor}
        className={cn(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          hiddenLabel && "sr-only",
        )}
      >
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="space-y-1">
        {children}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
