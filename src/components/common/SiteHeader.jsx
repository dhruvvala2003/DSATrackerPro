import { NavLink } from 'react-router-dom'
import { ArrowUpRight, Code2 } from 'lucide-react'

export default function SiteHeader() {
  return (
    <header className="site-header">
      <NavLink to="/" className="brand" aria-label="DSA Tracker home">
        <span className="brand-mark"><Code2 size={18} /></span>
        <span>DSA<span className="brand-accent">/</span>TRACKER</span>
      </NavLink>
      <nav className="site-nav" aria-label="Main navigation">
        <NavLink to="/solve" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Explore topics</NavLink>
        <NavLink to="/admin/add" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Admin</NavLink>
        <NavLink to="/solve" className="header-action">Start solving <ArrowUpRight size={16} /></NavLink>
      </nav>
    </header>
  )
}