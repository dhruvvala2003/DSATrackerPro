import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, ChevronRight, Search } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../common/Loading'

export default function SolvePage() {
  const { topicId, subtopicId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [topics, setTopics] = useState([])
  const [subtopics, setSubtopics] = useState([])
  const [problems, setProblems] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadContent = async () => {
      const [{ data: topicData, error: topicError }, { data: subtopicData, error: subtopicError }, { data: problemData, error: problemError }] = await Promise.all([
        supabase.from('topics').select('id, name, description').order('name'),
        supabase.from('subtopics').select('id, topic_id, name, description').order('name'),
        supabase.from('problems').select('id, subtopic_id, title, difficulty, status').order('title'),
      ])
      const requestError = topicError || subtopicError || problemError
      if (requestError) setError(requestError.code === '42501' ? 'Supabase blocked the explorer read. Run the SELECT policies in supabase-policies.sql.' : requestError.message)
      setTopics(topicData || [])
      setSubtopics(subtopicData || [])
      setProblems(problemData || [])
      setLoading(false)
    }
    queueMicrotask(loadContent)
  }, [])

  const topic = topics.find((item) => String(item.id) === String(topicId))
  const subtopic = subtopics.find((item) => String(item.id) === String(subtopicId))
  const isAllSubtopics = location.pathname === '/solve/subtopics'
  const isAllQuestions = location.pathname === '/solve/questions'
  const topicSubtopics = useMemo(() => isAllSubtopics ? subtopics : subtopics.filter((item) => String(item.topic_id) === String(topicId)), [isAllSubtopics, subtopics, topicId])
  const subtopicProblems = useMemo(() => isAllQuestions ? problems : problems.filter((item) => String(item.subtopic_id) === String(subtopicId)), [isAllQuestions, problems, subtopicId])
  const filteredTopics = useMemo(() => filterItems(topics, search), [topics, search])
  const filteredSubtopics = useMemo(() => filterItems(topicSubtopics, search), [topicSubtopics, search])
  const filteredProblems = useMemo(() => filterItems(subtopicProblems, search), [subtopicProblems, search])

  if (loading) return <Loading />

  const level = subtopicId || isAllQuestions ? 'questions' : topicId || isAllSubtopics ? 'subtopics' : 'topics'
  const pageTitle = level === 'topics' ? 'Topic name' : level === 'subtopics' ? 'Subtopic name' : 'Question name'
  const pageKicker = level === 'topics' ? '01 / roadmap' : level === 'subtopics' ? `02 / patterns · ${topic?.name || 'Topic'}` : `03 / practice · ${subtopic?.name || 'Subtopic'}`
  const rows = level === 'topics' ? filteredTopics : level === 'subtopics' ? filteredSubtopics : filteredProblems

  return (
    <div className="content-page solve-page">
      <div className="content-container explorer-container">
        <div className="explorer-heading">
          <div><p className="eyebrow"><span className="eyebrow-dot" /> Practice library</p><h1 className="page-heading">Start solving</h1></div>
          <p className="explorer-copy">Choose one level at a time. Follow the arrow to move from topic to pattern to question.</p>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="explorer-toolbar">
          <label className="search-box"><Search size={17} /><span className="sr-only">Search {level}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${level}`} /></label>
          {level === 'subtopics' && topicId && <button type="button" className="clear-filters" onClick={() => navigate('/solve/subtopics')}><ArrowLeft size={16} /> All subtopics</button>}
          {level === 'questions' && subtopicId && <button type="button" className="clear-filters" onClick={() => navigate('/solve/questions')}><ArrowLeft size={16} /> All questions</button>}
        </div>

        <div className="explorer-breadcrumbs"><Link to="/solve">Topics</Link>{(topic || isAllSubtopics) && <><ChevronRight size={14} /><Link to={topic ? `/solve/topic/${topic.id}` : '/solve/subtopics'}>{topic?.name || 'All subtopics'}</Link></>}{(subtopic || isAllQuestions) && <><ChevronRight size={14} /><Link to={subtopic ? `/solve/subtopic/${subtopic.id}` : '/solve/questions'}>{subtopic?.name || 'All questions'}</Link></>}</div>

        <section className="explorer-section single-table-section">
          <div className="table-heading"><div><span className="table-kicker">{pageKicker}</span><h2>{pageTitle}</h2></div><span>{rows.length} {level}</span></div>
          <div className="explorer-table">
            {rows.length ? rows.map((item) => renderRow(item, level)) : <div className="table-empty">No matching {level} found.</div>}
          </div>
        </section>
      </div>
    </div>
  )
}

function filterItems(items, query) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return items
  return items.filter((item) => `${item.name || item.title} ${item.description || ''}`.toLowerCase().includes(normalizedQuery))
}

function renderRow(item, level) {
  if (level === 'topics') {
    return <Link className="explorer-row" key={item.id} to={`/solve/topic/${item.id}`}><div><strong>{item.name}</strong><span>{item.description || 'Explore the core patterns in this topic.'}</span></div><span className="row-arrow" aria-hidden="true"><ChevronRight size={19} /></span></Link>
  }
  if (level === 'subtopics') {
    return <Link className="explorer-row" key={item.id} to={`/solve/subtopic/${item.id}`}><div><strong>{item.name}</strong><span>{item.description || 'Open questions for this pattern.'}</span></div><span className="row-arrow" aria-hidden="true"><ChevronRight size={19} /></span></Link>
  }
  return <Link className="explorer-row question-row" key={item.id} to={`/problem/${item.id}`}><div><strong>{item.title}</strong><span>{item.status || 'Not Started'}</span></div><span className={`difficulty ${item.difficulty?.toLowerCase()}`}>{item.difficulty || 'Medium'}</span><ArrowRight size={17} /></Link>
}
