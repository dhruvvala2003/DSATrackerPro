import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../common/Loading'
import { ArrowLeft, ArrowRight, FolderOpen, LayoutList } from 'lucide-react'
import { motion } from 'framer-motion'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
}

export default function SubtopicsPage() {
  const { topicId } = useParams()
  const [topic, setTopic] = useState(null)
  const [subtopics, setSubtopics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTopicAndSubtopics = async () => {
      try {
        const [topicResponse, subtopicsResponse] = await Promise.all([
          supabase.from('topics').select('*').eq('id', topicId).single(),
          supabase.from('subtopics').select('*').eq('topic_id', topicId).order('name')
        ])
        
        if (topicResponse.error) throw topicResponse.error
        if (subtopicsResponse.error) throw subtopicsResponse.error

        setTopic(topicResponse.data)
        
        // Fetch stats for subtopics
        if (subtopicsResponse.data.length > 0) {
          const subtopicIds = subtopicsResponse.data.map(s => s.id)
          const { data: problemsData } = await supabase
            .from('problems')
            .select('subtopic_id, status')
            .in('subtopic_id', subtopicIds)

          const subtopicsWithStats = subtopicsResponse.data.map(subtopic => {
            const subtopicProblems = problemsData?.filter(p => p.subtopic_id === subtopic.id) || []
            const total = subtopicProblems.length
            const completed = subtopicProblems.filter(p => p.status === 'Completed').length
            
            return {
              ...subtopic,
              total_problems: total,
              completed_problems: completed,
              progress: total > 0 ? Math.round((completed / total) * 100) : 0
            }
          })
          
          setSubtopics(subtopicsWithStats)
        } else {
          setSubtopics([])
        }
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }

    queueMicrotask(fetchTopicAndSubtopics)
  }, [topicId])

  if (loading) return <Loading />

  return (
    <motion.div 
      className="w-full max-w-5xl mx-auto pb-20"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="mb-12">
        <Link to="/topics" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-6 group text-sm font-medium">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to roadmap
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm w-fit mb-4">
              <span className="w-2 h-2 rounded-full bg-fuchsia-600" />
              <span className="text-sm font-semibold text-slate-700">Topic Outline</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
              {topic?.name}
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl">
              {topic?.description || "Break down this topic into digestible sub-patterns. Conquer them one by one."}
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900">{subtopics.length}</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subtopics</div>
            </div>
            <div className="w-px h-10 bg-slate-200" />
            <div className="text-left">
              <div className="text-2xl font-bold text-indigo-600">
                {subtopics.reduce((acc, curr) => acc + (curr.total_problems || 0), 0)}
              </div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Problems</div>
            </div>
          </div>
        </div>
      </motion.div>

      {subtopics.length === 0 ? (
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <FolderOpen size={48} className="text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No subtopics yet</h2>
          <p className="text-slate-500">This topic is currently empty. Check back later for new patterns.</p>
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {subtopics.map((subtopic) => (
            <motion.div key={subtopic.id} variants={itemVariants}>
              <Link 
                to={`/subtopic/${subtopic.id}`}
                className="group flex flex-col h-full p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-fuchsia-300 transition-all duration-300 overflow-hidden relative"
              >
                {/* Hover gradient effect */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-fuchsia-500/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex items-start justify-between mb-6 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 group-hover:bg-fuchsia-50 group-hover:text-fuchsia-600 group-hover:border-fuchsia-200 transition-colors shadow-sm">
                    <LayoutList size={24} />
                  </div>
                  
                  {/* Circular Progress Indicator */}
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-12 h-12 transform -rotate-90">
                      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100" />
                      <circle 
                        cx="24" cy="24" r="20" 
                        stroke="currentColor" 
                        strokeWidth="4" 
                        fill="transparent" 
                        strokeDasharray={20 * 2 * Math.PI} 
                        strokeDashoffset={20 * 2 * Math.PI - ((subtopic.progress || 0) / 100) * 20 * 2 * Math.PI}
                        className={`${subtopic.progress === 100 ? 'text-emerald-500' : 'text-fuchsia-500'} transition-all duration-1000 ease-out`} 
                      />
                    </svg>
                    <span className="absolute text-[10px] font-bold text-slate-700">
                      {subtopic.progress || 0}%
                    </span>
                  </div>
                </div>
                
                <div className="mt-auto relative z-10">
                  <h2 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-fuchsia-600 transition-colors">
                    {subtopic.name}
                  </h2>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-2">
                    {subtopic.description || "Master the specific problems categorized under this pattern."}
                  </p>
                  
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
                        {subtopic.completed_problems || 0} / {subtopic.total_problems || 0} solved
                      </span>
                    </div>
                    <div className="flex items-center text-sm font-semibold text-fuchsia-600 opacity-80 group-hover:opacity-100 transition-opacity">
                      View problems
                      <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
