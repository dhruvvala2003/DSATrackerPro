import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../common/Loading'
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Code2, FileText, Lightbulb, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  },
  exit: { opacity: 0, transition: { duration: 0.2 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
}

export default function ProblemDetailPage() {
  const { problemId } = useParams()
  const [problem, setProblem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showNotes, setShowNotes] = useState(false)
  const [solutionTab, setSolutionTab] = useState('optimal')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    const loadProblem = async () => {
      try {
        const { data, error } = await supabase
          .from('problems')
          .select('*, subtopic_id')
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

  const toggleStatus = async () => {
    if (updating) return
    setUpdating(true)
    try {
      const newStatus = problem.status === 'Completed' ? 'In Progress' : 'Completed'
      const { error } = await supabase
        .from('problems')
        .update({ status: newStatus })
        .eq('id', problem.id)
      
      if (!error) {
        setProblem({ ...problem, status: newStatus })
      }
    } catch (err) {
      console.error('Error updating status:', err)
    } finally {
      setUpdating(false)
    }
  }

  const getDifficultyStyles = (difficulty) => {
    const diff = difficulty?.toLowerCase() || 'easy'
    if (diff === 'easy') return "bg-emerald-50 text-emerald-600 border-emerald-200"
    if (diff === 'medium') return "bg-amber-50 text-amber-600 border-amber-200"
    if (diff === 'hard') return "bg-rose-50 text-rose-600 border-rose-200"
    return "bg-slate-100 text-slate-600 border-slate-200"
  }

  if (loading) return <Loading />
  if (!problem) return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-4">
        <Code2 size={24} />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Problem Not Found</h2>
      <p className="text-slate-500 mb-6">The problem you are looking for doesn't exist or has been removed.</p>
      <Link to="/topics" className="text-indigo-600 hover:text-indigo-700 font-medium">Return to roadmap</Link>
    </div>
  )

  const tabs = [
    { id: 'brute', label: 'Brute Force', icon: Code2, color: 'text-rose-500', bg: 'bg-rose-50' },
    { id: 'good', label: 'Better', icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 'optimal', label: 'Optimal', icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-50' }
  ]

  const activeTab = tabs.find(t => t.id === solutionTab)
  const codeContent = (solutionTab === 'brute' ? problem.brute_force_code : solutionTab === 'good' ? problem.good_approach_code : problem.optimal_approach_code) || (solutionTab === 'optimal' ? problem.code_snippet : '') || '// No code provided for this approach yet.'

  return (
    <motion.div 
      className="w-full max-w-4xl mx-auto pb-20"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div variants={itemVariants} className="mb-8">
        <Link to={`/subtopic/${problem.subtopic_id}`} className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-6 group text-sm font-medium">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to problems
        </Link>
        
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">
          {problem.title}
        </h1>
        
        <div className="flex flex-wrap items-center gap-3">
          <span className={`px-3 py-1 rounded-full border text-xs font-semibold tracking-wide uppercase ${getDifficultyStyles(problem.difficulty)}`}>
            {problem.difficulty || 'Easy'}
          </span>
          
          <button 
            onClick={toggleStatus}
            disabled={updating}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold tracking-wide uppercase transition-colors ${
              problem.status === 'Completed' 
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' 
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <CheckCircle2 size={14} className={problem.status === 'Completed' ? 'text-indigo-600' : 'text-slate-400'} />
            {problem.status || 'Not Started'}
          </button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="mb-10">
        {/* Sleek IDE-like Code Window - Light Mode Variant */}
        <div className="rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 shadow-sm">
          {/* Window Header */}
          <div className="flex items-center justify-between px-4 h-12 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
            </div>
            
            <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSolutionTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    solutionTab === tab.id 
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <tab.icon size={12} className={solutionTab === tab.id ? tab.color : 'text-slate-400'} />
                  {tab.label}
                </button>
              ))}
            </div>
            
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
          
          {/* Code Area */}
          <div className="relative group">
            <pre className="p-6 overflow-x-auto text-sm text-slate-800 font-mono leading-relaxed bg-slate-50 min-h-[300px]">
              <code className="block whitespace-pre">
                {codeContent}
              </code>
            </pre>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="flex items-center justify-between w-full p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <FileText size={18} />
            </div>
            <span className="font-semibold text-slate-900">Notes & Takeaways</span>
          </div>
          
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-slate-200 transition-colors">
            {showNotes ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        </button>
        
        <AnimatePresence>
          {showNotes && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="p-6 mt-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
                {problem.notes ? (
                  <div className="prose max-w-none text-slate-700 prose-p:leading-relaxed prose-a:text-indigo-600 hover:prose-a:text-indigo-700">
                    {problem.notes.split('\n').map((para, i) => (
                      <p key={i} className="mb-2 last:mb-0">{para}</p>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 italic">
                    No notes added yet. Use this space to document your thought process and key insights.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      <motion.div variants={itemVariants} className="mt-8 flex justify-end">
        <button 
          onClick={toggleStatus}
          disabled={updating}
          className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
            problem.status === 'Completed' 
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg'
          }`}
        >
          {problem.status === 'Completed' ? 'Mark as Incomplete' : 'Mark as Completed'}
          {!updating && problem.status !== 'Completed' && <CheckCircle2 size={18} />}
        </button>
      </motion.div>
    </motion.div>
  )
}
