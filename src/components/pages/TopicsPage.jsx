import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../common/Loading'

export default function TopicsPage() {
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTopics()
  }, [])

  const fetchTopics = async () => {
    try {
      const { data, error } = await supabase.from('topics').select('*')
      if (error) throw error
      setTopics(data || [])
    } catch (err) {
      console.error('Error fetching topics:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div className="content-page">
      <div className="content-container">
        <p className="eyebrow"><span className="eyebrow-dot" /> The roadmap</p>
        <h1 className="page-heading">
          DSA Topics
        </h1>
        <p className="page-description">Choose a lane, build the fundamentals, and make your way toward harder problems with a little more confidence each time.</p>

        {topics.length === 0 ? (
          <div className="empty-state">
            <p>No topics found. Add some topics to get started.</p>
            <Link to="/admin/add" className="primary-action" style={{ display: 'inline-flex', marginTop: '20px' }}>
              Add Topics
            </Link>
          </div>
        ) : (
          <div className="content-grid">
            {topics.map((topic) => (
              <Link
                key={topic.id}
                to={`/topic/${topic.id}`}
                className="content-card"
              >
                <h2>
                  {topic.name}
                </h2>
                <p className="text-gray-400">{topic.description}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
