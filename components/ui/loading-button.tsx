"use client"

import * as React from "react"
import { Button, type ButtonProps } from "@/components/ui/button"

type LoadingButtonProps = ButtonProps & {
  isLoading?: boolean
  loadingText?: string
}

export function LoadingButton({
  isLoading,
  loadingText,
  disabled,
  children,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      disabled={disabled || isLoading}
      className={className}
      {...props}
    >
      {isLoading && (
        <span className="mr-2 inline-flex items-center">
          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
        </span>
      )}
      {isLoading && loadingText ? loadingText : children}
    </Button>
  )
}


