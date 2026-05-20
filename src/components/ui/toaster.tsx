import * as React from "react"
import { Notifications, notifications } from "@mantine/notifications"

import { useToast } from "@/hooks/use-toast"

const DEFAULT_TOAST_DURATION = 5000

type ToastItem = ReturnType<typeof useToast>["toasts"][number]

function getToastMessage({ description, action }: ToastItem) {
  if (!description && !action) {
    return undefined
  }

  return (
    <div className="grid gap-1">
      {description ? <div className="text-sm opacity-90">{description}</div> : null}
      {action ?? null}
    </div>
  )
}

function getNotificationColor(variant: ToastItem["variant"]) {
  return variant === "destructive" ? "red" : undefined
}

export function Toaster() {
  const { toasts } = useToast()
  const visibleToastIdsRef = React.useRef(new Set<string>())
  const toastLookupRef = React.useRef(new Map<string, ToastItem>())

  toastLookupRef.current = new Map(
    toasts.map((toast) => [toast.id, toast] satisfies [string, ToastItem])
  )

  React.useEffect(() => {
    const openToasts = toasts.filter((toast) => toast.open)
    const nextVisibleToastIds = new Set(openToasts.map((toast) => toast.id))

    visibleToastIdsRef.current.forEach((toastId) => {
      if (!nextVisibleToastIds.has(toastId)) {
        notifications.hide(toastId)
      }
    })

    openToasts.forEach((toast) => {
      const notification = {
        id: toast.id,
        title: toast.title,
        message: getToastMessage(toast),
        color: getNotificationColor(toast.variant),
        autoClose: toast.duration ?? DEFAULT_TOAST_DURATION,
        withCloseButton: true,
        onClose: () => {
          const activeToast = toastLookupRef.current.get(toast.id)

          if (activeToast?.open) {
            activeToast.onOpenChange?.(false)
          }
        },
      }

      if (visibleToastIdsRef.current.has(toast.id)) {
        notifications.update(notification)
        return
      }

      notifications.show(notification)
    })

    visibleToastIdsRef.current = nextVisibleToastIds
  }, [toasts])

  React.useEffect(() => {
    return () => {
      visibleToastIdsRef.current.forEach((toastId) => {
        notifications.hide(toastId)
      })

      visibleToastIdsRef.current.clear()
    }
  }, [])

  return <Notifications position="top-right" zIndex={100} />
}
