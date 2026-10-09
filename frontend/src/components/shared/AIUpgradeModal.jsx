import React from 'react';
import { Zap, X, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIUpgradeModal({ onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-sm rounded-3xl p-6"
          style={{ background: 'var(--bam-surface)' }}
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-2xl bg-violet-100 flex items-center justify-center">
              <Zap className="w-5 h-5 text-violet-600" />
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--bam-text)' }}>
            AI limit reached
          </h2>
          <p className="text-sm mb-1" style={{ color: 'var(--bam-text-muted)' }}>
            You've used all 50 free AI calls this month.
          </p>
          <p className="text-sm mb-5" style={{ color: 'var(--bam-text-muted)' }}>
            Upgrade to <strong style={{ color: 'var(--bam-primary)' }}>BookAm Pro</strong> for unlimited AI — smart replies, no-show predictions, gap filling and more.
          </p>

          <a
            href="mailto:support@bookam.business?subject=BookAm Pro Upgrade&body=Hi, I'd like to upgrade to BookAm Pro for unlimited AI features."
            className="w-full btn-primary flex items-center justify-center gap-2 mb-3"
            onClick={onClose}
          >
            <Mail className="w-4 h-4" /> Contact us to upgrade
          </a>
          <button onClick={onClose} className="w-full py-2 text-sm font-medium" style={{ color: 'var(--bam-text-muted)' }}>
            Maybe later
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
