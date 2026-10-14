import { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Code2, BookOpen, Shield, LogOut, LogIn, User, PlusCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'

export default function SiteHeader() {
  const { user, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
      navigate('/login')
    } catch (err) {
      console.error('Sign out error:', err)
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/85 border-b border-slate-200/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
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

        {/* Navigation */}
        <nav className="flex items-center gap-3 sm:gap-5 whitespace-nowrap" aria-label="Main navigation">
          <NavLink
            to="/solve"
            className={({ isActive }) =>
              `text-sm font-medium transition-colors hover:text-indigo-600 ${
                isActive ? 'text-indigo-600 font-semibold' : 'text-slate-600'
              }`
            }
          >
            Explore topics
          </NavLink>

          <NavLink
            to="/notes"
            className={({ isActive }) =>
              `flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-indigo-600 ${
                isActive ? 'text-indigo-600 font-semibold' : 'text-slate-600'
              }`
            }
          >
            <BookOpen size={15} />
            Notes
          </NavLink>

          {/* Master Admin specific links */}
          {isAdmin && (
            <>
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`
                }
              >
                <Shield size={13} />
                User Approvals
              </NavLink>

              <NavLink
                to="/admin/add"
                className={({ isActive }) =>
                  `hidden md:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors ${
                    isActive ? 'border-indigo-500 text-indigo-600 font-semibold' : ''
                  }`
                }
              >
                <PlusCircle size={13} />
                Add Question
              </NavLink>
            </>
          )}

          {/* User Profile / Auth State */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div
                className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg max-w-[170px] truncate"
                title={user.email}
              >
                <User size={13} className="text-slate-400 shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>

              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 px-3 py-1.5 rounded-lg transition-colors"
                title="Sign out of your account"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <Link
                to="/login"
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 rounded-lg transition-colors shadow-sm"
              >
                <LogIn size={13} />
                <span>Sign In</span>
              </Link>
            </div>
          )}

          {/* Quick CTA */}
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="hidden xl:block">
            <NavLink
              to="/solve"
              className="group flex items-center gap-1 text-xs font-semibold bg-slate-900 text-white px-3.5 py-2 rounded-full hover:bg-slate-800 transition-colors shadow-sm"
            >
              Start solving
              <ArrowUpRight
                size={14}
                className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
              />
            </NavLink>
          </motion.div>
        </nav>
      </div>
    </header>
  )
}