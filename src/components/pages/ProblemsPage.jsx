import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../common/Loading'
import { ArrowLeft, CheckCircle2, ChevronRight, CircleDashed, LayoutList, Trophy } from 'lucide-react'
import { motion } from 'framer-motion'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
}

export default function ProblemsPage() {
  const { subtopicId } = useParams()
  const [subtopic, setSubtopic] = useState(null)
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSubtopicAndProblems = async () => {
      try {
        const [subtopicResponse, problemsResponse] = await Promise.all([
          supabase.from('subtopics').select('*, topics(id, name)').eq('id', subtopicId).single(),
          supabase.from('problems').select('*').eq('subtopic_id', subtopicId).order('title')
        ])

        if (subtopicResponse.error) throw subtopicResponse.error
        if (problemsResponse.error) throw problemsResponse.error

        setSubtopic(subtopicResponse.data)
        setProblems(problemsResponse.data)
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }

    queueMicrotask(fetchSubtopicAndProblems)
  }, [subtopicId])

  const getDifficultyStyles = (difficulty) => {
    const diff = difficulty?.toLowerCase() || 'easy'
    if (diff === 'easy') return "bg-emerald-50 text-emerald-600 border-emerald-200"
    if (diff === 'medium') return "bg-amber-50 text-amber-600 border-amber-200"
    if (diff === 'hard') return "bg-rose-50 text-rose-600 border-rose-200"
    return "bg-slate-100 text-slate-600 border-slate-200"
  }

  const getStatusIcon = (status) => {
    if (status === 'Completed') return <CheckCircle2 size={18} className="text-emerald-500" />
    if (status === 'In Progress') return <CircleDashed size={18} className="text-amber-500 animate-[spin_4s_linear_infinite]" />
    return <CircleDashed size={18} className="text-slate-300" />
  }

  if (loading) return <Loading />

  const completedCount = problems.filter(p => p.status === 'Completed').length
  const progressPercentage = problems.length > 0 ? Math.round((completedCount / problems.length) * 100) : 0

  return (
    <motion.div 
      className="w-full max-w-5xl mx-auto pb-20"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="mb-12">
        <Link 
          to={subtopic?.topic_id ? `/topic/${subtopic.topic_id}` : '/topics'} 
          className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-6 group text-sm font-medium"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to {subtopic?.topics?.name || 'topic'}
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm w-fit mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-semibold text-slate-700">Problem Set</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
              {subtopic?.name}
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl">
              {subtopic?.description || "Work through these problems to master the pattern."}
            </p>
          </div>
          
          {/* Progress Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm min-w-[200px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Progress</span>
              <span className="text-sm font-bold text-slate-900">{completedCount} / {problems.length}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </div>
            <div className="text-right text-xs font-semibold text-emerald-600">
              {progressPercentage}% Completed
            </div>
          </div>
        </div>
      </motion.div>

      {problems.length === 0 ? (
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <LayoutList size={48} className="text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No problems yet</h2>
          <p className="text-slate-500">There are no problems added to this subtopic yet.</p>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          {/* List Header */}
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-7 md:col-span-5">Problem</div>
            <div className="col-span-4 md:col-span-2 text-center">Difficulty</div>
            <div className="hidden md:block col-span-3">Companies</div>
            <div className="hidden md:block col-span-1 text-center"></div>
          </div>
          
          <div className="divide-y divide-slate-100">
            {problems.map((problem) => (
              <Link 
                to={`/problem/${problem.id}`}
                key={problem.id}
                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors group"
              >
                <div className="col-span-1 flex justify-center">
                  {getStatusIcon(problem.status)}
                </div>
                
                <div className="col-span-7 md:col-span-5 flex flex-col">
                  <span className={`font-semibold transition-colors ${problem.status === 'Completed' ? 'text-slate-500 line-through' : 'text-slate-900 group-hover:text-indigo-600'}`}>
                    {problem.title}
                  </span>
                </div>
                
                <div className="col-span-4 md:col-span-2 flex justify-center">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${getDifficultyStyles(problem.difficulty)} ${problem.status === 'Completed' ? 'opacity-50' : ''}`}>
                    {problem.difficulty || 'Easy'}
                  </span>
                </div>
                
                <div className="hidden md:flex col-span-3 items-center gap-2 overflow-hidden">
                  {problem.companies && problem.companies.length > 0 ? (
                    <>
                      <span className="px-2 py-1 rounded bg-slate-100 border border-slate-200 text-xs text-slate-600 font-medium truncate max-w-[100px]">
                        {problem.companies[0]}
                      </span>
                      {problem.companies.length > 1 && (
                        <span className="px-2 py-1 rounded bg-slate-100 border border-slate-200 text-xs text-slate-500 font-medium">
                          +{problem.companies.length - 1}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400 text-sm">-</span>
                  )}
                </div>
                
                <div className="hidden md:flex col-span-1 justify-center">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Completion Celebration */}
      {problems.length > 0 && completedCount === problems.length && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
          className="mt-8 p-6 rounded-3xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
              <Trophy size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-900">Pattern Mastered!</h3>
              <p className="text-emerald-700 font-medium">You've solved all problems in this subtopic.</p>
            </div>
          </div>
          <Link 
            to="/topics"
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors shadow-sm"
          >
            Next Pattern
          </Link>
        </motion.div>
      )}
    </motion.div>
  )
}
