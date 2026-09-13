import { NavLink, useLocation } from 'react-router-dom'
import { ArrowUpRight, Code2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function SiteHeader() {
  const location = useLocation()
  
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/70 border-b border-slate-200/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <NavLink 
          to="/" 
          className="flex items-center gap-2 group transition-opacity hover:opacity-80"
          aria-label="DSA Tracker home"
        >
          <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
            <Code2 size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">
            DSA<span className="text-indigo-600">/</span>TRACKER
          </span>
        </NavLink>
        
        <nav className="flex items-center gap-6" aria-label="Main navigation">
          <NavLink 
            to="/solve" 
            className={({ isActive }) => 
              `text-sm font-medium transition-colors hover:text-indigo-600 ${isActive ? 'text-indigo-600' : 'text-slate-600'}`
            }
          >
            Explore topics
          </NavLink>
          
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <NavLink 
              to="/solve" 
              className="group flex items-center gap-1 text-sm font-medium bg-slate-900 text-white px-4 py-2 rounded-full hover:bg-slate-800 transition-colors shadow-sm hover:shadow-md"
            >
              Start solving 
              <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </NavLink>
          </motion.div>
        </nav>
      </div>
    </header>
  )
}