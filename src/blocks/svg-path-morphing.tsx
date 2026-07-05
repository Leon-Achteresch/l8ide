"use client";

import { useState, type ElementType } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { LucideProps } from "lucide-react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

type SpringConfig = {
  type: "spring";
  stiffness?: number;
  bounce?: number;
  damping?: number;
  mass?: number;
  visualDuration?: number;
};

export type SvgPathMorphingProps = {
  size?: number;
  strokeWidth?: number;
  isOpen: boolean;
  openIcon: ElementType<LucideProps>;
  closedIcon: ElementType<LucideProps>;
  spring?: SpringConfig;
  className?: string;
};

const DEFAULT_SPRING: SpringConfig = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

export function SvgPathMorphing({
  size = 24,
  strokeWidth = 2,
  isOpen,
  openIcon: OpenIcon,
  closedIcon: ClosedIcon,
  spring = DEFAULT_SPRING,
  className,
}: SvgPathMorphingProps) {
  return (
    <div
      className={`relative ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="open"
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={spring}
          >
            <OpenIcon size={size} strokeWidth={strokeWidth} />
          </motion.div>
        ) : (
          <motion.div
            key="closed"
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={spring}
          >
            <ClosedIcon size={size} strokeWidth={strokeWidth} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const controls = {
  size: [100, 16, 120, 2],
  strokeWidth: [1.5, 0, 4, 0.5],
  spring: { type: "spring", stiffness: 300, damping: 30 },
};

export default function SvgPathMorphingDemo({
  size = 100,
  strokeWidth = 1.5,
  spring,
  className,
}: Partial<SvgPathMorphingProps>) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-background">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-label={open ? "Close" : "Open"}
        className="text-foreground"
      >
        <SvgPathMorphing
          size={size}
          strokeWidth={strokeWidth}
          isOpen={open}
          openIcon={PanelLeftClose}
          closedIcon={PanelLeftOpen}
          spring={spring}
          className={className}
        />
      </button>
    </div>
  );
}
