"use client"

import * as React from "react"
import { format, type Locale } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DatePickerProps {
  /**
   * The selected date
   */
  value?: Date
  /**
   * Callback fired when the date changes
   */
  onValueChange?: (date: Date | undefined) => void
  /**
   * Placeholder text when no date is selected
   */
  placeholder?: string
  /**
   * Whether the date picker is disabled
   */
  disabled?: boolean
  /**
   * Additional CSS classes
   */
  className?: string
  /**
   * The date format for display (defaults to "PPP" - e.g., "Apr 29th, 1453")
   */
  dateFormat?: string
  /**
   * Whether to show the calendar icon
   */
  showIcon?: boolean
  /**
   * Custom icon component
   */
  icon?: React.ReactNode
  /**
   * The minimum selectable date
   */
  fromDate?: Date
  /**
   * The maximum selectable date
   */
  toDate?: Date
  /**
   * Whether to disable dates before today
   */
  disablePast?: boolean
  /**
   * Whether to disable dates after today
   */
  disableFuture?: boolean
  /**
   * Custom function to determine if a date should be disabled
   */
  disabledDate?: (date: Date) => boolean
  /**
   * The locale for date formatting
   */
  locale?: Locale
  /**
   * Whether the date picker is required
   */
  required?: boolean
  /**
   * Error state for form validation
   */
  error?: boolean
  /**
   * Error message to display
   */
  errorMessage?: string
  /**
   * Label for accessibility
   */
  "aria-label"?: string
  /**
   * ID for the input element
   */
  id?: string
  /**
   * Name for form submission
   */
  name?: string
}

const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      value,
      onValueChange,
      placeholder = "Pick a date",
      disabled = false,
      className,
      dateFormat = "PPP",
      showIcon = true,
      icon,
      fromDate,
      toDate,
      disablePast = false,
      disableFuture = false,
      disabledDate,
      locale,
      required = false,
      error = false,
      errorMessage,
      "aria-label": ariaLabel,
      id,
      name,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)

    // Handle date selection
    const handleSelect = (date: Date | undefined) => {
      onValueChange?.(date)
      setOpen(false)
    }

    // Determine if a date should be disabled
    const isDateDisabled = React.useCallback(
      (date: Date) => {
        if (disabledDate?.(date)) return true
        if (disablePast && date < new Date(new Date().setHours(0, 0, 0, 0))) return true
        if (disableFuture && date > new Date(new Date().setHours(23, 59, 59, 999))) return true
        if (fromDate && date < fromDate) return true
        if (toDate && date > toDate) return true
        return false
      },
      [disabledDate, disablePast, disableFuture, fromDate, toDate]
    )

    // Format the selected date for display
    const formattedDate = React.useMemo(() => {
      if (!value) return null
      try {
        return format(value, dateFormat, { locale })
      } catch (error) {
        console.warn("Date formatting error:", error)
        return value.toLocaleDateString()
      }
    }, [value, dateFormat, locale])

    return (
      <div className="space-y-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={ref}
              id={id}
              name={name}
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !value && "text-muted-foreground",
                error && "border-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
                className
              )}
              disabled={disabled}
              aria-label={ariaLabel || placeholder}
              aria-required={required}
              aria-invalid={error}
              data-empty={!value}
              {...props}
            >
              {showIcon && (
                <div className="flex items-center">
                  {icon || <CalendarIcon className="mr-2 h-4 w-4" />}
                </div>
              )}
              <span className="flex-1">
                {formattedDate || placeholder}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleSelect}
              disabled={isDateDisabled}
              initialFocus
              className="rounded-md border-0"
            />
          </PopoverContent>
        </Popover>
        
        {/* Error message */}
        {error && errorMessage && (
          <p className="text-sm text-destructive" role="alert" aria-live="polite">
            {errorMessage}
          </p>
        )}
      </div>
    )
  }
)

DatePicker.displayName = "DatePicker"

export { DatePicker }
