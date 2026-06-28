"use client"

import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Radix / shadcn 社区推荐的 hover 下拉模式：
 * - DropdownMenu 设 modal={false}，避免 body pointer-events: none 导致闪烁
 * - 外层 div onMouseLeave 收起，鼠标可移入菜单内容
 * @see https://github.com/radix-ui/primitives/discussions/2300
 */
export function HoverDropdownMenu({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  return (
    <div onMouseLeave={() => onOpenChange(false)}>
      <DropdownMenu open={open} onOpenChange={onOpenChange} modal={false}>
        {children}
      </DropdownMenu>
    </div>
  )
}

export function HoverDropdownMenuTrigger({
  children,
  onOpen,
  ...props
}: React.ComponentProps<typeof DropdownMenuTrigger> & {
  onOpen: () => void
}) {
  return (
    <DropdownMenuTrigger
      {...props}
      onMouseEnter={() => onOpen()}
    >
      {children}
    </DropdownMenuTrigger>
  )
}

export function HoverDropdownMenuContent({
  onCloseAutoFocus,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      sideOffset={0}
      onCloseAutoFocus={(event) => {
        event.preventDefault()
        onCloseAutoFocus?.(event)
      }}
      {...props}
    />
  )
}
