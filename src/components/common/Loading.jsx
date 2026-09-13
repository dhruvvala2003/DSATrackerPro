import React from 'react'
import { motion } from 'framer-motion'

export default function Loading() {
  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full"
        />
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
          Loading your roadmap...
        </p>
      </div>
    </div>
  )
}
