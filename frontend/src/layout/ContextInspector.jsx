import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * 300px right inspector panel.
 * Slides in and out. Sits alongside the operational canvas.
 */
export default function ContextInspector({ isOpen, onClose, title, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          key="inspector"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 'var(--inspector-width)', opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          style={{ width: 'var(--inspector-width)', flexShrink: 0 }}
          className="h-full flex flex-col bg-[var(--surface-2)] border-l border-[var(--surface-border)] overflow-hidden z-10"
        >
          {/* Inspector header */}
          {title && (
            <div className="h-10 px-4 flex items-center justify-between border-b border-[var(--surface-border)] shrink-0">
              <span className="text-[10px] font-semibold tracking-widest text-[var(--text-muted)] uppercase">
                {title}
              </span>
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-5 h-5 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
