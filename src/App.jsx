import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import HomePage from './components/pages/HomePage'
import TopicsPage from './components/pages/TopicsPage'
import SubtopicsPage from './components/pages/SubtopicsPage'
import ProblemsPage from './components/pages/ProblemsPage'
import ProblemDetailPage from './components/pages/ProblemDetailPage'
import AdminPanel from './components/pages/AdminPanel'
import SolvePage from './components/pages/SolvePage'
import SiteHeader from './components/common/SiteHeader'
import './App.css'

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/topics" element={<TopicsPage />} />
        <Route path="/solve" element={<SolvePage />} />
        <Route path="/solve/topic/:topicId" element={<SolvePage />} />
        <Route path="/solve/subtopics" element={<SolvePage />} />
        <Route path="/solve/subtopic/:subtopicId" element={<SolvePage />} />
        <Route path="/solve/questions" element={<SolvePage />} />
        <Route path="/topic/:topicId" element={<SubtopicsPage />} />
        <Route path="/subtopic/:subtopicId" element={<ProblemsPage />} />
        <Route path="/problem/:problemId" element={<ProblemDetailPage />} />
        <Route path="/admin/add" element={<AdminPanel />} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900 relative overflow-hidden flex flex-col font-sans">
        {/* Background glow effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-rose-500/10 blur-[120px] pointer-events-none" />
        
        <SiteHeader />
        
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 relative z-10">
          <AnimatedRoutes />
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
