import * as React from "react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"

export function TestSidebarButtons() {
  const { setOpen, setOpenMobile, isMobile } = useSidebar()

  const openLeft = () => {
    // For desktop use context, for mobile set mobile open
    if (isMobile) {
      setOpenMobile(true)
    } else {
      setOpen(true)
    }
    try {
      document.documentElement.setAttribute('data-sidebar-open', 'true')
      window.dispatchEvent(new CustomEvent('app:sidebarToggled', { detail: { open: true } }))
    } catch (err) {
      // ignore
    }
  }

  const openRight = () => {
    // Right-sided sidebar requires setting the attribute and event; the sidebar component uses data-side prop.
    if (isMobile) {
      setOpenMobile(true)
    } else {
      setOpen(true)
    }
    try {
      document.documentElement.setAttribute('data-sidebar-open', 'true')
      window.dispatchEvent(new CustomEvent('app:sidebarToggled', { detail: { open: true } }))
    } catch (err) {
      // ignore
    }
  }

  return (
    <div className="flex gap-2 items-center px-4 py-2">
      <Button size="sm" variant="ghost" onClick={openLeft}>Abrir izquierda</Button>
      <Button size="sm" variant="ghost" onClick={openRight}>Abrir derecha</Button>
    </div>
  )
}

export default TestSidebarButtons
