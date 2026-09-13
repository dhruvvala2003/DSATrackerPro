import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../common/Loading'
import { motion, AnimatePresence } from 'framer-motion'

const initialFormData = {
  topicName: '',
  topicDesc: '',
  subtopicName: '',
  subtopicDesc: '',
  problemTitle: '',
  bruteForceCode: '',
  goodApproachCode: '',
  optimalApproachCode: '',
  problemNotes: '',
  problemCompanies: '',
  problemDifficulty: 'Medium',
  selectedTopic: '',
  selectedSubtopic: '',
}

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

export default function AdminPanel() {
  const location = useLocation()
  const navigate = useNavigate()
  const query = new URLSearchParams(location.search)
  const isEditMode = query.get('mode') === 'edit'
  const editingProblemId = query.get('problemId') || ''
  const [step, setStep] = useState('topic')
  const [topics, setTopics] = useState([])
  const [subtopics, setSubtopics] = useState([])
  const [formData, setFormData] = useState(initialFormData)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const loadOptions = async () => {
    setLoading(true)
    setSubmitError('')
    const [{ data: topicData, error: topicError }, { data: subtopicData, error: subtopicError }] = await Promise.all([
      supabase.from('topics').select('*').order('name'),
      supabase.from('subtopics').select('*').order('name'),
    ])

    if (topicError || subtopicError) {
      setSubmitError(topicError?.code === '42501' || subtopicError?.code === '42501'
        ? 'Supabase blocked loading topics or subtopics. Run the SELECT policies from supabase-policies.sql, then refresh this page.'
        : topicError?.message || subtopicError?.message || 'Unable to load topics and subtopics.')
    } else {
      setTopics(topicData || [])
      setSubtopics(subtopicData || [])
    }

    if (isEditMode && editingProblemId) {
      await loadProblemForEdit(editingProblemId, topicData || [], subtopicData || [])
    }

    setLoading(false)
  }

  const loadProblemForEdit = async (problemId, topicList = [], subtopicList = []) => {
    const primaryFields = 'id, subtopic_id, title, brute_force_code, good_approach_code, optimal_approach_code, code_snippet, notes, difficulty, status, companies'
    const fallbackFields = 'id, subtopic_id, title, brute_force_code, good_approach_code, optimal_approach_code, code_snippet, notes, difficulty, status'

    const { data: problemData, error: problemError } = await supabase
      .from('problems')
      .select(primaryFields)
      .eq('id', problemId)
      .single()

    let loadedProblem = problemData
    let loadError = problemError

    if (loadError?.message?.toLowerCase().includes('companies')) {
      const fallback = await supabase
        .from('problems')
        .select(fallbackFields)
        .eq('id', problemId)
        .single()

      loadedProblem = fallback.data
      loadError = fallback.error
    }

    if (loadError) {
      setSubmitError(handleError(loadError, 'check'))
      return
    }

    const subtopic = subtopicList.find((item) => String(item.id) === String(loadedProblem.subtopic_id)) || null
    const topic = topicList.find((item) => String(item.id) === String(subtopic?.topic_id)) || null

    setFormData({
      ...initialFormData,
      selectedTopic: topic?.id || '',
      selectedSubtopic: subtopic?.id || loadedProblem.subtopic_id || '',
      problemTitle: loadedProblem.title || '',
      bruteForceCode: loadedProblem.brute_force_code || '',
      goodApproachCode: loadedProblem.good_approach_code || '',
      optimalApproachCode: loadedProblem.optimal_approach_code || loadedProblem.code_snippet || '',
      problemNotes: loadedProblem.notes || '',
      problemCompanies: Array.isArray(loadedProblem.companies) ? loadedProblem.companies.join(', ') : '',
      problemDifficulty: loadedProblem.difficulty || 'Medium',
    })
    setStep('problem')
  }

  useEffect(() => {
    queueMicrotask(loadOptions)
  }, [location.search])

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }))
    setSubmitError('')
    setSuccessMessage('')
  }

  const changeStep = (nextStep) => {
    setStep(nextStep)
    setSubmitError('')
    setSuccessMessage('')
  }

  const handleError = (error, action = 'save') => {
    if (error?.code === '42501') {
      const policyType = action === 'check' ? 'SELECT' : 'INSERT'
      return `Supabase blocked this ${policyType} because of Row Level Security. Run the ${policyType} policies from supabase-policies.sql in your Supabase SQL Editor, then refresh this page.`
    }
    return error?.message || 'Unable to save this item.'
  }

  const handleAddTopic = async (event) => {
    event.preventDefault()
    const topicName = formData.topicName.trim()
    if (!topicName) {
      setSubmitError('Enter a topic name before adding it.')
      return
    }

    setSaving(true)
    setSubmitError('')
    const { data: existingTopics, error: duplicateCheckError } = await supabase
      .from('topics')
      .select('id')
      .ilike('name', topicName)
      .limit(1)
    if (duplicateCheckError) {
      setSaving(false)
      setSubmitError(handleError(duplicateCheckError, 'check'))
      return
    }
    if (existingTopics?.length) {
      setSaving(false)
      setSubmitError(`Topic “${topicName}” is already added.`)
      return
    }

    const { data, error } = await supabase.from('topics').insert({
      name: topicName,
      description: formData.topicDesc.trim(),
    }).select().single()
    setSaving(false)

    if (error) {
      setSubmitError(handleError(error))
      return
    }

    const newTopic = data
    setTopics((current) => [...current, newTopic].sort((a, b) => a.name.localeCompare(b.name)))
    setFormData((current) => ({ ...current, topicName: '', topicDesc: '', selectedTopic: newTopic.id }))
    setSuccessMessage(`“${newTopic.name}” added. Add a subtopic for it below.`)
    setStep('subtopic')
  }

  const handleAddSubtopic = async (event) => {
    event.preventDefault()
    if (!formData.selectedTopic) {
      setSubmitError('Choose a parent topic first.')
      return
    }
    const subtopicName = formData.subtopicName.trim()
    if (!subtopicName) {
      setSubmitError('Enter a subtopic name before adding it.')
      return
    }

    setSaving(true)
    setSubmitError('')
    const { data: existingSubtopics, error: duplicateCheckError } = await supabase
      .from('subtopics')
      .select('id')
      .eq('topic_id', formData.selectedTopic)
      .ilike('name', subtopicName)
      .limit(1)
    if (duplicateCheckError) {
      setSaving(false)
      setSubmitError(handleError(duplicateCheckError, 'check'))
      return
    }
    if (existingSubtopics?.length) {
      setSaving(false)
      setSubmitError(`Subtopic “${subtopicName}” is already added to this topic.`)
      return
    }

    const { data, error } = await supabase.from('subtopics').insert({
      topic_id: formData.selectedTopic,
      name: subtopicName,
      description: formData.subtopicDesc.trim(),
    }).select().single()
    setSaving(false)

    if (error) {
      setSubmitError(handleError(error))
      return
    }

    setSubtopics((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)))
    setFormData((current) => ({ ...current, subtopicName: '', subtopicDesc: '', selectedSubtopic: data.id }))
    setSuccessMessage(`“${data.name}” added. Add a question for it below.`)
    setStep('problem')
  }

  const handleAddProblem = async (event) => {
    event.preventDefault()
    if (!formData.selectedTopic || !formData.selectedSubtopic) {
      setSubmitError('Choose both a topic and a subtopic first.')
      return
    }
    const problemTitle = formData.problemTitle.trim()
    if (!problemTitle) {
      setSubmitError('Enter a question title before adding it.')
      return
    }

    const companies = normalizeCompanies(formData.problemCompanies)
    const payload = {
      subtopic_id: formData.selectedSubtopic,
      title: problemTitle,
      brute_force_code: formData.bruteForceCode.trim(),
      good_approach_code: formData.goodApproachCode.trim(),
      optimal_approach_code: formData.optimalApproachCode.trim(),
      code_snippet: formData.optimalApproachCode.trim(),
      notes: formData.problemNotes.trim(),
      difficulty: formData.problemDifficulty,
      status: 'Not Started',
    }

    if (companies.length) {
      payload.companies = companies
    }

    setSaving(true)
    setSubmitError('')

    if (isEditMode && editingProblemId) {
      let { error: updateError } = await supabase
        .from('problems')
        .update(payload)
        .eq('id', editingProblemId)

      if (updateError?.message?.toLowerCase().includes('companies')) {
        delete payload.companies
        const retry = await supabase
          .from('problems')
          .update(payload)
          .eq('id', editingProblemId)
        updateError = retry.error
      }

      setSaving(false)

      if (updateError) {
        setSubmitError(handleError(updateError))
        return
      }

      navigate(`/problem/${editingProblemId}`)
      return
    }

    const { data: existingProblems, error: duplicateCheckError } = await supabase
      .from('problems')
      .select('id')
      .eq('subtopic_id', formData.selectedSubtopic)
      .ilike('title', problemTitle)
      .limit(1)
    if (duplicateCheckError) {
      setSaving(false)
      setSubmitError(handleError(duplicateCheckError, 'check'))
      return
    }
    if (existingProblems?.length) {
      setSaving(false)
      setSubmitError(`Question “${problemTitle}” is already added to this subtopic.`)
      return
    }

    let { error } = await supabase.from('problems').insert(payload)
    if (error?.message?.toLowerCase().includes('companies')) {
      delete payload.companies
      const retry = await supabase.from('problems').insert(payload)
      error = retry.error
    }
    setSaving(false)

    if (error) {
      setSubmitError(handleError(error))
      return
    }

    setFormData((current) => ({ ...current, problemTitle: '', bruteForceCode: '', goodApproachCode: '', optimalApproachCode: '', problemNotes: '', problemCompanies: '' }))
    setSuccessMessage('Question added. You can add another one or choose a different subtopic.')
  }

  const normalizeCompanies = (companyText) => {
    if (!companyText || !companyText.trim()) return []
    return companyText
      .split(',')
      .map((company) => company.trim())
      .filter(Boolean)
  }

  const visibleSubtopics = formData.selectedTopic
    ? subtopics.filter((subtopic) => String(subtopic.topic_id) === String(formData.selectedTopic))
    : []

  if (loading) {
    return <Loading />
  }

  const inputClass = "w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
  const textareaClass = "w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all min-h-[120px] font-mono resize-y"
  const labelClass = "block text-sm font-semibold text-slate-700 mb-2"
  
  return (
    <motion.div 
      className="w-full max-w-3xl mx-auto pb-20"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm mb-4">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span className="text-sm font-semibold text-slate-700">Content Studio</span>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
          Build the roadmap
        </h1>
        <p className="text-lg text-slate-600">
          Create a topic, connect a subtopic, then add focused questions.
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="flex p-1 bg-slate-100 rounded-2xl mb-8 border border-slate-200 w-fit">
        {[
          ['topic', 'Topic'],
          ['subtopic', 'Subtopic'],
          ['problem', 'Question'],
        ].map(([value, label]) => (
          <button 
            key={value} 
            type="button" 
            role="tab" 
            aria-selected={step === value} 
            onClick={() => changeStep(value)} 
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              step === value 
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            {label}
          </button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {submitError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
              {submitError}
            </div>
          )}
          {successMessage && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
              {successMessage}
            </div>
          )}

          {step === 'topic' && (
            <form onSubmit={handleAddTopic} className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
              <div className="mb-8">
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-2 block">01 / foundation</span>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Start with a topic</h2>
                <p className="text-slate-500 text-sm">A broad area such as Arrays, Trees, or Dynamic Programming.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label htmlFor="topic-name" className={labelClass}>Topic name</label>
                  <input id="topic-name" className={inputClass} value={formData.topicName} onChange={(e) => updateField('topicName', e.target.value)} placeholder="e.g. Arrays" />
                </div>
                <div>
                  <label htmlFor="topic-description" className={labelClass}>Description</label>
                  <textarea id="topic-description" className={`${textareaClass} font-sans`} value={formData.topicDesc} onChange={(e) => updateField('topicDesc', e.target.value)} placeholder="What will this topic cover?" />
                </div>
                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <span className="text-xs font-medium text-slate-400">Names are checked before saving.</span>
                  <button type="submit" className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-sm" disabled={saving}>
                    {saving ? 'Adding...' : 'Add topic'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {step === 'subtopic' && (
            <form onSubmit={handleAddSubtopic} className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
              <div className="mb-8">
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-2 block">02 / direction</span>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Shape the topic</h2>
                <p className="text-slate-500 text-sm">Choose a topic, then add a pattern or smaller area to practice.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label htmlFor="subtopic-topic" className={labelClass}>Parent topic</label>
                  <select id="subtopic-topic" className={`${inputClass} cursor-pointer appearance-none`} value={formData.selectedTopic} onChange={(e) => { updateField('selectedTopic', e.target.value); updateField('selectedSubtopic', '') }}>
                    <option value="">Choose a topic</option>
                    {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="subtopic-name" className={labelClass}>Subtopic name</label>
                  <input id="subtopic-name" className={inputClass} value={formData.subtopicName} onChange={(e) => updateField('subtopicName', e.target.value)} placeholder="e.g. Two pointers" />
                </div>
                <div>
                  <label htmlFor="subtopic-description" className={labelClass}>Description</label>
                  <textarea id="subtopic-description" className={`${textareaClass} font-sans`} value={formData.subtopicDesc} onChange={(e) => updateField('subtopicDesc', e.target.value)} placeholder="What pattern will learners practice?" />
                </div>
                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <span className="text-xs font-medium text-slate-400">{topics.length ? `${topics.length} topics available` : 'Add a topic first'}</span>
                  <button type="submit" className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-sm disabled:opacity-50" disabled={saving || !topics.length}>
                    {saving ? 'Adding...' : 'Add subtopic'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {step === 'problem' && (
            <form onSubmit={handleAddProblem} className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
              <div className="mb-8">
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-2 block">03 / practice</span>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{isEditMode ? 'Edit question' : 'Add a question'}</h2>
                <p className="text-slate-500 text-sm">Questions are grouped under a subtopic so learners always know what they are practicing.</p>
              </div>

              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="problem-topic" className={labelClass}>Topic</label>
                    <select id="problem-topic" className={`${inputClass} cursor-pointer appearance-none`} value={formData.selectedTopic} onChange={(e) => { updateField('selectedTopic', e.target.value); updateField('selectedSubtopic', '') }}>
                      <option value="">Choose a topic</option>
                      {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="problem-subtopic" className={labelClass}>Subtopic</label>
                    <select id="problem-subtopic" className={`${inputClass} cursor-pointer appearance-none disabled:opacity-50`} value={formData.selectedSubtopic} onChange={(e) => updateField('selectedSubtopic', e.target.value)} disabled={!formData.selectedTopic}>
                      <option value="">{formData.selectedTopic ? 'Choose a subtopic' : 'Choose a topic first'}</option>
                      {visibleSubtopics.map((subtopic) => <option key={subtopic.id} value={subtopic.id}>{subtopic.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="problem-title" className={labelClass}>Question title</label>
                  <input id="problem-title" className={inputClass} value={formData.problemTitle} onChange={(e) => updateField('problemTitle', e.target.value)} placeholder="e.g. Find the maximum subarray" />
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="problem-difficulty" className={labelClass}>Difficulty</label>
                    <select id="problem-difficulty" className={`${inputClass} cursor-pointer appearance-none`} value={formData.problemDifficulty} onChange={(e) => updateField('problemDifficulty', e.target.value)}>
                      <option>Easy</option>
                      <option>Medium</option>
                      <option>Hard</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="problem-companies" className={labelClass}>Companies</label>
                    <input id="problem-companies" className={inputClass} value={formData.problemCompanies} onChange={(e) => updateField('problemCompanies', e.target.value)} placeholder="Microsoft, Google, Amazon" />
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      <label htmlFor="problem-brute-force" className="text-sm font-semibold text-slate-700">Brute force solution</label>
                    </div>
                    <textarea id="problem-brute-force" className={textareaClass} value={formData.bruteForceCode} onChange={(e) => updateField('bruteForceCode', e.target.value)} placeholder="Straightforward solution" />
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      <label htmlFor="problem-good-approach" className="text-sm font-semibold text-slate-700">Better approach</label>
                    </div>
                    <textarea id="problem-good-approach" className={textareaClass} value={formData.goodApproachCode} onChange={(e) => updateField('goodApproachCode', e.target.value)} placeholder="Improved solution" />
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <label htmlFor="problem-optimal-approach" className="text-sm font-bold text-slate-800">Optimal solution</label>
                    </div>
                    <textarea id="problem-optimal-approach" className={`${textareaClass} border-emerald-200 focus:ring-emerald-500/20 focus:border-emerald-500`} value={formData.optimalApproachCode} onChange={(e) => updateField('optimalApproachCode', e.target.value)} placeholder="Best known solution" />
                  </div>
                </div>

                <div>
                  <label htmlFor="problem-notes" className={labelClass}>Notes</label>
                  <textarea id="problem-notes" className={`${textareaClass} font-sans min-h-[80px]`} value={formData.problemNotes} onChange={(e) => updateField('problemNotes', e.target.value)} placeholder="Add hints or takeaways" />
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <span className="text-xs font-medium text-slate-400">{visibleSubtopics.length ? `${visibleSubtopics.length} subtopics available` : 'Choose a topic first'}</span>
                  <button type="submit" className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-sm disabled:opacity-50" disabled={saving || !visibleSubtopics.length}>
                    {saving ? (isEditMode ? 'Saving...' : 'Adding...') : (isEditMode ? 'Save changes' : 'Add question')}
                  </button>
                </div>
              </div>
            </form>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
