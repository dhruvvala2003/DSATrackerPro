import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../common/Loading'

export default function SolvePage() {
  const [topics, setTopics] = useState([])
  const [subtopics, setSubtopics] = useState([])
  const [problems, setProblems] = useState([])
  const [selectedTopic, setSelectedTopic] = useState('')
  const [selectedSubtopic, setSelectedSubtopic] = useState('')
  const [selectedCompany, setSelectedCompany] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const handleDeleteProblem = async (problemId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('problems')
        .delete()
        .eq('id', problemId)

      if (error) throw error

      setProblems((current) => current.filter((problem) => problem.id !== problemId))
    } catch (deleteError) {
      setError(deleteError?.message || 'Unable to delete this question.')
    }
  }

  useEffect(() => {
    const loadContent = async () => {
      try {
        const [{ data: topicData, error: topicError }, { data: subtopicData, error: subtopicError }] = await Promise.all([
          supabase.from('topics').select('id, name, description').order('name'),
          supabase.from('subtopics').select('id, topic_id, name, description').order('name'),
        ])

        if (topicError || subtopicError) {
          const requestError = topicError || subtopicError
          setError(requestError.code === '42501' ? 'Supabase blocked the explorer read. Run the SELECT policies in supabase-policies.sql.' : requestError.message)
        }

        const allProblemsResponse = await supabase
          .from('problems')
          .select('id, subtopic_id, title, difficulty, status, companies')
          .order('title')

        if (allProblemsResponse.error) {
          if (allProblemsResponse.error.message?.toLowerCase().includes('companies')) {
            const fallbackResponse = await supabase
              .from('problems')
              .select('id, subtopic_id, title, difficulty, status')
              .order('title')
            setProblems(fallbackResponse.data || [])
          } else {
            setError(allProblemsResponse.error.code === '42501'
              ? 'Supabase blocked the explorer read. Run the SELECT policies in supabase-policies.sql.'
              : allProblemsResponse.error.message)
          }
        } else {
          setProblems(allProblemsResponse.data || [])
        }

        setTopics(topicData || [])
        setSubtopics(subtopicData || [])
      } catch (caughtError) {
        setError(caughtError?.message || 'Unable to load the question list.')
      } finally {
        setLoading(false)
      }
    }
    queueMicrotask(loadContent)
  }, [])

  const companyOptions = useMemo(() => {
    return Array.from(new Set(problems.flatMap((problem) => problem.companies || []))).sort((left, right) => left.localeCompare(right))
  }, [problems])

  const visibleSubtopics = useMemo(() => {
    if (!selectedTopic) return subtopics
    return subtopics.filter((item) => String(item.topic_id) === String(selectedTopic))
  }, [selectedTopic, subtopics])

  const rows = useMemo(() => {
    return problems.map((problem) => {
      const subtopic = subtopics.find((item) => String(item.id) === String(problem.subtopic_id)) || null
      const topic = topics.find((item) => String(item.id) === String(subtopic?.topic_id)) || null

      return {
        id: problem.id,
        topic,
        subtopic,
        title: problem.title,
        difficulty: problem.difficulty || 'Medium',
        status: problem.status || 'Not Started',
        companies: problem.companies || [],
      }
    })
  }, [problems, subtopics, topics])

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return rows.filter((row) => {
      const matchesTopic = !selectedTopic || (row.topic && String(row.topic.id) === String(selectedTopic))
      const matchesSubtopic = !selectedSubtopic || (row.subtopic && String(row.subtopic.id) === String(selectedSubtopic))
      const matchesCompany = !selectedCompany || (row.companies || []).includes(selectedCompany)
      const matchesSearch = !normalizedSearch || `${row.title || ''} ${row.subtopic?.name || ''} ${row.topic?.name || ''}`.toLowerCase().includes(normalizedSearch)

      return matchesTopic && matchesSubtopic && matchesCompany && matchesSearch
    })
  }, [rows, selectedCompany, selectedSubtopic, selectedTopic, search])

  if (loading) return <Loading />

  return (
    <div className="content-page solve-page">
      <div className="content-container explorer-container">
        <div className="explorer-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-dot" /> Practice library</p>
            <h1 className="page-heading">Start solving</h1>
          </div>
          <div className="solve-heading-actions">
            <p className="explorer-copy">Explore every question in one view. Filter by topic, pattern, company, or the problem title.</p>
            <Link className="solid-button add-button" to="/admin/add">Add</Link>
          </div>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="explorer-toolbar solve-filters">
          <label className="filter-field">
            <span className="filter-label">Topic</span>
            <select value={selectedTopic} onChange={(event) => {
              setSelectedTopic(event.target.value)
              setSelectedSubtopic('')
            }}>
              <option value="">All topics</option>
              {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
            </select>
          </label>

          <label className="filter-field">
            <span className="filter-label">Subtopic</span>
            <select value={selectedSubtopic} onChange={(event) => setSelectedSubtopic(event.target.value)} disabled={!visibleSubtopics.length}>
              <option value="">All subtopics</option>
              {visibleSubtopics.map((subtopic) => <option key={subtopic.id} value={subtopic.id}>{subtopic.name}</option>)}
            </select>
          </label>

          <label className="search-box filter-field search-filter">
            <Search size={17} />
            <span className="sr-only">Search questions</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search question" />
          </label>

          <label className="filter-field">
            <span className="filter-label">Company</span>
            <select value={selectedCompany} onChange={(event) => setSelectedCompany(event.target.value)}>
              <option value="">All companies</option>
              {companyOptions.map((company) => <option key={company} value={company}>{company}</option>)}
            </select>
          </label>
        </div>

        <section className="explorer-section single-table-section">
          <div className="table-heading">
            <div>
              <span className="table-kicker">03 / practice · all questions</span>
              <h2>Question list</h2>
            </div>
            <span>{filteredRows.length} question{filteredRows.length === 1 ? '' : 's'}</span>
          </div>
          <div className="explorer-table flat-question-table">
            {filteredRows.length ? (
              <table className="question-table">
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>Subtopic</th>
                    <th>Question Name</th>
                    <th>Rating</th>
                    <th>Companies</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.topic?.name || 'Unknown topic'}</td>
                      <td>{row.subtopic?.name || 'Unknown subtopic'}</td>
                      <td><Link className="question-link" to={`/problem/${row.id}`}>{row.title}</Link></td>
                      <td><span className={`difficulty ${row.difficulty?.toLowerCase()}`}>{row.difficulty}</span></td>
                      <td><span className="company-list">{(row.companies || []).length ? row.companies.join(', ') : '—'}</span></td>
                      <td className="row-actions">
                        <Link className="row-action edit-action" to={`/admin/add?mode=edit&problemId=${row.id}`}>Edit</Link>
                        <button type="button" className="row-action delete-action" onClick={() => handleDeleteProblem(row.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="table-empty">No matching questions found.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
