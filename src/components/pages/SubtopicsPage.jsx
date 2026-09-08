import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../common/Loading'

export default function SubtopicsPage() {
  const { topicId } = useParams()
  const [topic, setTopic] = useState(null)
  const [subtopics, setSubtopics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [topicId])

  const fetchData = async () => {
    try {
      const { data: topicData, error: topicError } = await supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .single()

      if (topicError) throw topicError
      setTopic(topicData)

      const { data: subtopicsData, error: subtopicsError } = await supabase
        .from('subtopics')
        .select('*')
        .eq('topic_id', topicId)

      if (subtopicsError) throw subtopicsError
      setSubtopics(subtopicsData || [])
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
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
          {topic?.name}
        </h1>
        <p className="page-description">{topic?.description}</p>

        {subtopics.length === 0 ? (
          <p className="empty-state">No subtopics found</p>
        ) : (
          <div className="content-grid">
            {subtopics.map((subtopic) => (
              <Link
                key={subtopic.id}
                to={`/subtopic/${subtopic.id}`}
                className="content-card"
              >
                <h2>
                  {subtopic.name}
                </h2>
                <p className="text-gray-400">{subtopic.description}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
