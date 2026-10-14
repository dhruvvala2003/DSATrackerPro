import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'

import HomePage from './components/pages/HomePage'
import TopicsPage from './components/pages/TopicsPage'
import SubtopicsPage from './components/pages/SubtopicsPage'
import ProblemsPage from './components/pages/ProblemsPage'
import ProblemDetailPage from './components/pages/ProblemDetailPage'
import AdminPanel from './components/pages/AdminPanel'
import SolvePage from './components/pages/SolvePage'
import SubjectsListPage from './components/pages/SubjectsListPage'
import SubnotesListPage from './components/pages/SubnotesListPage'
import NotesListPage from './components/pages/NotesListPage'
import AuthPage from './components/pages/AuthPage'
import ResetPasswordPage from './components/pages/ResetPasswordPage'
import UserManagementPage from './components/pages/UserManagementPage'

import SiteHeader from './components/common/SiteHeader'
import Toaster from './components/common/Toaster'
import Loading from './components/common/Loading'
import './App.css'

// The rich-text editor (TipTap + syntax highlighting) is large; load it only when a note is opened.
const NoteEditorPage = lazy(() => import('./components/pages/NoteEditorPage'))
const NoteReaderPage = lazy(() => import('./components/pages/NoteReaderPage'))

// Moving between pages of the same subnote/subject keeps the editor/reader screen mounted
function routeKey(pathname) {
  const sub = /^\/notes\/subject\/([^/]+)\/subnote\/([^/]+)\/(edit|read)(?:\/|$)/.exec(pathname)
  if (sub) return `/notes/subject/${sub[1]}/subnote/${sub[2]}/${sub[3]}`
  const notes = /^\/notes\/subject\/([^/]+)\/(edit|read)(?:\/|$)/.exec(pathname)
  return notes ? `/notes/subject/${notes[1]}/${notes[2]}` : pathname
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={routeKey(location.pathname)}>
        {/* Public auth routes */}
        <Route path="/login" element={<AuthPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Master account admin routes */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute adminOnly>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/add"
          element={
            <ProtectedRoute adminOnly>
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        {/* Protected application routes (require approved login) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/topics"
          element={
            <ProtectedRoute>
              <TopicsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/solve"
          element={
            <ProtectedRoute>
              <SolvePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/solve/topic/:topicId"
          element={
            <ProtectedRoute>
              <SolvePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/solve/subtopics"
          element={
            <ProtectedRoute>
              <SolvePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/solve/subtopic/:subtopicId"
          element={
            <ProtectedRoute>
              <SolvePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/solve/questions"
          element={
            <ProtectedRoute>
              <SolvePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/topic/:topicId"
          element={
            <ProtectedRoute>
              <SubtopicsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subtopic/:subtopicId"
          element={
            <ProtectedRoute>
              <ProblemsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/problem/:problemId"
          element={
            <ProtectedRoute>
              <ProblemDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Notes routes: Subject -> Subnotes -> Pages */}
        <Route
          path="/notes"
          element={
            <ProtectedRoute>
              <SubjectsListPage />
            </ProtectedRoute>
          }
        />
        {/* Layer 2: Sub-notes list for a subject */}
        <Route
          path="/notes/subject/:subjectId"
          element={
            <ProtectedRoute>
              <SubnotesListPage />
            </ProtectedRoute>
          }
        />
        {/* Layer 3: Pages list inside a sub-note */}
        <Route
          path="/notes/subject/:subjectId/subnote/:subnoteId"
          element={
            <ProtectedRoute>
              <NotesListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notes/subject/:subjectId/subnote/:subnoteId/edit"
          element={
            <ProtectedRoute>
              <NoteEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notes/subject/:subjectId/subnote/:subnoteId/edit/:pageId"
          element={
            <ProtectedRoute>
              <NoteEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notes/subject/:subjectId/subnote/:subnoteId/read"
          element={
            <ProtectedRoute>
              <NoteReaderPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notes/subject/:subjectId/subnote/:subnoteId/read/:pageId"
          element={
            <ProtectedRoute>
              <NoteReaderPage />
            </ProtectedRoute>
          }
        />

        {/* Fallbacks for direct subject routes */}
        <Route
          path="/notes/subject/:subjectId/pages"
          element={
            <ProtectedRoute>
              <NotesListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notes/subject/:subjectId/edit"
          element={
            <ProtectedRoute>
              <NoteEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notes/subject/:subjectId/edit/:pageId"
          element={
            <ProtectedRoute>
              <NoteEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notes/subject/:subjectId/read"
          element={
            <ProtectedRoute>
              <NoteReaderPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notes/subject/:subjectId/read/:pageId"
          element={
            <ProtectedRoute>
              <NoteReaderPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* overflow-x-clip so sticky header and editor toolbar stick properly */}
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
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
