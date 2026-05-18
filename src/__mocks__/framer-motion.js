// Thin mock so component tests don't depend on RAF/animation timing.
// Replaces animated elements with plain HTML equivalents.
import { forwardRef } from 'react'

const passthrough = (tag) =>
  forwardRef(({ children, ...props }, ref) => {
    // Strip framer-motion-only props so React doesn't warn about unknown DOM attrs
    const {
      animate, initial, exit, transition, variants, whileHover, whileTap,
      whileFocus, whileDrag, whileInView, drag, dragConstraints,
      dragElastic, dragMomentum, layout, layoutId, onAnimationComplete,
      onAnimationStart, onUpdate, onDragEnd, onDragStart, ...rest
    } = props
    return React.createElement(tag, { ...rest, ref }, children)
  })

import React from 'react'

export const m = new Proxy({}, { get: (_, tag) => passthrough(tag) })
export const motion = new Proxy({}, { get: (_, tag) => passthrough(tag) })

export function AnimatePresence({ children }) { return children }
export function LazyMotion({ children }) { return children }
export function MotionConfig({ children }) { return children }

export const domAnimation = {}
export const domMax = {}

export function useReducedMotion() { return false }
export function useAnimation() { return {} }
export function useMotionValue(v) { return { get: () => v, set: () => {} } }
export function useTransform(v, fn) { return v }
export function useSpring(v) { return v }
export function useScroll() { return { scrollY: { get: () => 0 } } }
export function useInView() { return false }
