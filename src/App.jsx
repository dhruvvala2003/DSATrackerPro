import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './components/pages/HomePage'
import TopicsPage from './components/pages/TopicsPage'
import SubtopicsPage from './components/pages/SubtopicsPage'
import ProblemsPage from './components/pages/ProblemsPage'
import ProblemDetailPage from './components/pages/ProblemDetailPage'
import AdminPanel from './components/pages/AdminPanel'
import SolvePage from './components/pages/SolvePage'
import SiteHeader from './components/common/SiteHeader'
import './App.css'

function App() {

  return (
    <BrowserRouter>
      <div className="app-shell">
        <SiteHeader />
        <Routes>
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
      </div>
    </BrowserRouter>
  )
}

export default App
