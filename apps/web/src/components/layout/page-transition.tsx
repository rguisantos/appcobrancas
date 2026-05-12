'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useNavigation } from '@/lib/store/navigation'

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -8 },
}

const pageTransition = {
  type: 'tween' as const,
  ease: 'anticipate' as const,
  duration: 0.25,
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const { currentView } = useNavigation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentView}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
