import { m } from 'framer-motion'
import type { ReactNode } from 'react'

interface DeviceShellProps {
  children: ReactNode
}

export function DeviceShell({ children }: DeviceShellProps) {
  return (
    <m.section
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.2, 0.88, 0.24, 1.18] }}
      className="pokedex-app-frame mx-auto w-full max-w-[1440px]"
    >
      {children}
    </m.section>
  )
}
