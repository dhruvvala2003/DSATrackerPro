import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../common/Loading'

export default function ProblemDetailPage() {
  const { problemId } = useParams()
  const [problem, setProblem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showNotes, setShowNotes] = useState(false)
  const [solutionTab, setSolutionTab] = useState('optimal')

  useEffect(() => {
    const loadProblem = async () => {
      try {
        const { data, error } = await supabase
          .from('problems')
          .select('*')
          .eq('id', problemId)
          .single()

        if (error) throw error
        setProblem(data)
      } catch (err) {
        console.error('Error fetching problem:', err)
      } finally {
        setLoading(false)
      }
    }

    queueMicrotask(loadProblem)
  }, [problemId])

  if (loading) return <Loading />
  if (!problem) return <div className="text-white text-center py-10">Problem not found</div>

  return (
    <div className="content-page">
      <div className="content-container" style={{ maxWidth: '860px' }}>
        <Link to="/topics" className="back-link">
          ← Back to topics
        </Link>

        <div className="detail-panel">
          <h1>{problem.title}</h1>
          
          <div className="flex gap-4 mb-8">
            <span className={`difficulty ${problem.difficulty?.toLowerCase()}`}>
              {problem.difficulty}
            </span>
            <span className="difficulty">
              {problem.status}
            </span>
          </div>

          {/* Code Section */}
          <div className="mb-8">
            <div className="solution-tabs" role="tablist" aria-label="Solution approaches">
              {[['brute', 'Brute force'], ['good', 'Good approach'], ['optimal', 'Optimal approach']].map(([value, label]) => <button type="button" role="tab" aria-selected={solutionTab === value} className={solutionTab === value ? 'solution-tab active' : 'solution-tab'} key={value} onClick={() => setSolutionTab(value)}>{label}</button>)}
            </div>
            <pre className="code-block">
              <code>{(solutionTab === 'brute' ? problem.brute_force_code : solutionTab === 'good' ? problem.good_approach_code : problem.optimal_approach_code) || (solutionTab === 'optimal' ? problem.code_snippet : '') || 'No code provided for this approach'}</code>
            </pre>
          </div>

          {/* Notes Section */}
          <div className="mb-8">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="detail-toggle"
            >
              📝 Notes & Takeaways
              <span className="text-sm">{showNotes ? '▼' : '▶'}</span>
            </button>
            {showNotes && (
              <div className="notes-block">
                {problem.notes || 'No notes added yet'}
              </div>
            )}
          </div>

          <button className="solid-button">
            Mark as Completed
          </button>
        </div>
      </div>
    </div>
  )
}
