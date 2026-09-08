import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../common/Loading'
import { Check, Clock, AlertCircle } from 'lucide-react'

export default function ProblemsPage() {
  const { subtopicId } = useParams()
  const [subtopic, setSubtopic] = useState(null)
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [subtopicId])

  const fetchData = async () => {
    try {
      const { data: subtopicData, error: subtopicError } = await supabase
        .from('subtopics')
        .select('*')
        .eq('id', subtopicId)
        .single()

      if (subtopicError) throw subtopicError
      setSubtopic(subtopicData)

      const { data: problemsData, error: problemsError } = await supabase
        .from('problems')
        .select('*')
        .eq('subtopic_id', subtopicId)

      if (problemsError) throw problemsError
      setProblems(problemsData || [])
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed':
        return <Check className="w-5 h-5 text-accent" />
      case 'In Progress':
        return <Clock className="w-5 h-5 text-secondary" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  if (loading) return <Loading />

  return (
    <div className="content-page">
      <div className="content-container">
        <Link to="/topics" className="back-link">
          ← Back to topics
        </Link>

        <h1 className="page-heading">
          {subtopic?.name}
        </h1>

        {problems.length === 0 ? (
          <p className="empty-state">No problems found</p>
        ) : (
          <div className="problem-list">
            {problems.map((problem) => (
              <Link
                key={problem.id}
                to={`/problem/${problem.id}`}
                className="problem-row"
              >
                <div className="flex-shrink-0">
                  {getStatusIcon(problem.status)}
                </div>
                <div className="flex-grow">
                  <h2>
                    {problem.title}
                  </h2>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className={`difficulty ${problem.difficulty?.toLowerCase()}`}>
                      {problem.difficulty}
                    </span>
                    <span className="text-gray-400">{problem.status}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
