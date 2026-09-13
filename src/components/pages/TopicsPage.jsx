import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../common/Loading'
import { ArrowRight, BookOpen, Layers3 } from 'lucide-react'
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

export default function TopicsPage() {
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const { data, error } = await supabase
          .from('topics')
          .select('*')
          .order('name')
        
        if (error) throw error
        setTopics(data)
      } catch (err) {
        console.error('Error fetching topics:', err)
      } finally {
        setLoading(false)
      }
    }

    queueMicrotask(fetchTopics)
  }, [])

  if (loading) return <Loading />

  return (
    <motion.div 
      className="w-full max-w-5xl mx-auto pb-20"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 w-fit shadow-sm mb-6">
          <span className="w-2 h-2 rounded-full bg-indigo-600" />
          <span className="text-sm font-semibold text-slate-700">DSA Roadmap</span>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
          Master the Patterns
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl">
          Follow a structured path through fundamental algorithms and data structures. Start from the basics and build your way up.
        </p>
      </motion.div>

      {topics.length === 0 ? (
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <BookOpen size={48} className="text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No topics found</h2>
          <p className="text-slate-500">There are no topics available right now. Check back later!</p>
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topics.map((topic, index) => (
            <motion.div key={topic.id} variants={itemVariants}>
              <Link 
                to={`/topic/${topic.id}`}
                className="group flex flex-col h-full p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 overflow-hidden relative"
              >
                {/* Hover gradient effect */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex items-start justify-between mb-8 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors shadow-sm">
                    <Layers3 size={24} />
                  </div>
                  <span className="text-6xl font-black text-slate-50 group-hover:text-slate-100 transition-colors select-none leading-none -mt-2 -mr-2">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                
                <div className="mt-auto relative z-10">
                  <h2 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                    {topic.name}
                  </h2>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-2">
                    {topic.description || `Explore problems and patterns related to ${topic.name}.`}
                  </p>
                  
                  <div className="flex items-center text-sm font-semibold text-indigo-600 opacity-80 group-hover:opacity-100 transition-opacity">
                    Start Topic
                    <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
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
