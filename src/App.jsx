import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import HomePage from './components/pages/HomePage'
import TopicsPage from './components/pages/TopicsPage'
import SubtopicsPage from './components/pages/SubtopicsPage'
import ProblemsPage from './components/pages/ProblemsPage'
import ProblemDetailPage from './components/pages/ProblemDetailPage'
import AdminPanel from './components/pages/AdminPanel'
import SolvePage from './components/pages/SolvePage'
import SubjectsListPage from './components/pages/SubjectsListPage'
import NotesListPage from './components/pages/NotesListPage'
import SiteHeader from './components/common/SiteHeader'
import Toaster from './components/common/Toaster'
import Loading from './components/common/Loading'
import './App.css'

// The rich-text editor (TipTap + syntax highlighting) is large; load it only when a note is opened.
const NoteEditorPage = lazy(() => import('./components/pages/NoteEditorPage'))
const NoteReaderPage = lazy(() => import('./components/pages/NoteReaderPage'))

// Moving between pages of the same subject keeps the editor/reader screen mounted
// (only the page inside it changes), instead of replaying the route transition.
function routeKey(pathname) {
  const notes = /^\/notes\/subject\/([^/]+)\/(edit|read)(?:\/|$)/.exec(pathname)
  return notes ? `/notes/subject/${notes[1]}/${notes[2]}` : pathname
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={routeKey(location.pathname)}>
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
        <Route path="/notes" element={<SubjectsListPage />} />
        <Route path="/notes/subject/:subjectId" element={<NotesListPage />} />
        <Route path="/notes/subject/:subjectId/edit" element={<NoteEditorPage />} />
        <Route path="/notes/subject/:subjectId/edit/:pageId" element={<NoteEditorPage />} />
        <Route path="/notes/subject/:subjectId/read" element={<NoteReaderPage />} />
        <Route path="/notes/subject/:subjectId/read/:pageId" element={<NoteReaderPage />} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <BrowserRouter>
      {/* overflow-x-clip (not overflow-hidden) so the sticky header and editor toolbar can stick */}
      <div className="min-h-screen bg-slate-50 text-slate-900 relative overflow-x-clip flex flex-col font-sans">
        {/* Background glow effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-rose-500/10 blur-[120px] pointer-events-none" />
        
        <SiteHeader />
        
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 relative z-10">
          <Suspense fallback={<Loading />}>
            <AnimatedRoutes />
          </Suspense>
        </main>
        <Toaster />
      </div>
    </BrowserRouter>
  )
}

export default App
