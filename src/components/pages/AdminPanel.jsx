import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

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
    return <div className="content-page" style={{ display: 'grid', placeItems: 'center' }}>Loading content options...</div>
  }

  return (
    <div className="content-page admin-page">
      <div className="content-container admin-panel" style={{ maxWidth: '820px' }}>
        <div className="admin-intro">
          <div><p className="eyebrow"><span className="eyebrow-dot" /> Content studio</p><h1 className="page-heading">Build the roadmap</h1></div>
          <p className="admin-intro-copy">Create a topic, connect a subtopic, then add focused questions. Your latest parent is selected for you automatically.</p>
        </div>

        <div className="admin-steps" role="tablist" aria-label="Content type">
          {[
            ['topic', 'Topic'],
            ['subtopic', 'Subtopic'],
            ['problem', 'Question'],
          ].map(([value, label]) => (
            <button key={value} type="button" role="tab" aria-selected={step === value} onClick={() => changeStep(value)} className={`admin-step ${step === value ? 'active' : ''}`}>
              {label}
            </button>
          ))}
        </div>

        {submitError && <p className="form-error" role="alert">{submitError}</p>}
        {successMessage && <p className="form-success" role="status">{successMessage}</p>}

        {step === 'topic' && (
            <form onSubmit={handleAddTopic} className="admin-form compact-form">
            <div className="form-heading"><span className="form-kicker">01 / foundation</span><h2>Start with a topic</h2><p>A broad area such as Arrays, Trees, or Dynamic Programming.</p></div>
            <div className="form-field"><label htmlFor="topic-name">Topic name</label><input id="topic-name" value={formData.topicName} onChange={(event) => updateField('topicName', event.target.value)} placeholder="e.g. Arrays" /></div>
            <div className="form-field"><label htmlFor="topic-description">Description</label><textarea id="topic-description" value={formData.topicDesc} onChange={(event) => updateField('topicDesc', event.target.value)} placeholder="What will this topic cover?" /></div>
            <div className="form-actions"><span className="form-hint">Names are checked before saving.</span><button type="submit" className="solid-button" disabled={saving}>{saving ? 'Adding topic...' : 'Add topic'}</button></div>
          </form>
        )}

        {step === 'subtopic' && (
            <form onSubmit={handleAddSubtopic} className="admin-form compact-form">
            <div className="form-heading"><span className="form-kicker">02 / direction</span><h2>Shape the topic</h2><p>Choose a topic, then add a pattern or smaller area to practice.</p></div>
            <div className="form-field"><label htmlFor="subtopic-topic">Parent topic</label><select id="subtopic-topic" value={formData.selectedTopic} onChange={(event) => { updateField('selectedTopic', event.target.value); updateField('selectedSubtopic', '') }}><option value="">Choose a topic</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></div>
            <div className="form-field"><label htmlFor="subtopic-name">Subtopic name</label><input id="subtopic-name" value={formData.subtopicName} onChange={(event) => updateField('subtopicName', event.target.value)} placeholder="e.g. Two pointers" /></div>
            <div className="form-field"><label htmlFor="subtopic-description">Description</label><textarea id="subtopic-description" value={formData.subtopicDesc} onChange={(event) => updateField('subtopicDesc', event.target.value)} placeholder="What pattern will learners practice?" /></div>
            <div className="form-actions"><span className="form-hint">{topics.length ? `${topics.length} topic${topics.length === 1 ? '' : 's'} available` : 'Add a topic first'}</span><button type="submit" className="solid-button" disabled={saving || !topics.length}>{saving ? 'Adding subtopic...' : 'Add subtopic'}</button></div>
          </form>
        )}

        {step === 'problem' && (
            <form onSubmit={handleAddProblem} className="admin-form">
            <div className="form-heading"><span className="form-kicker">03 / practice</span><h2>Add a question</h2><p>Questions are grouped under a subtopic so learners always know what they are practicing.</p></div>
            <div className="form-field"><label htmlFor="problem-topic">Topic</label><select id="problem-topic" value={formData.selectedTopic} onChange={(event) => { updateField('selectedTopic', event.target.value); updateField('selectedSubtopic', '') }}><option value="">Choose a topic</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></div>
            <div className="form-field"><label htmlFor="problem-subtopic">Subtopic</label><select id="problem-subtopic" value={formData.selectedSubtopic} onChange={(event) => updateField('selectedSubtopic', event.target.value)} disabled={!formData.selectedTopic}><option value="">{formData.selectedTopic ? 'Choose a subtopic' : 'Choose a topic first'}</option>{visibleSubtopics.map((subtopic) => <option key={subtopic.id} value={subtopic.id}>{subtopic.name}</option>)}</select></div>
            <div className="form-field"><label htmlFor="problem-title">Question title</label><input id="problem-title" value={formData.problemTitle} onChange={(event) => updateField('problemTitle', event.target.value)} placeholder="e.g. Find the maximum subarray" /></div>
            <div className="form-field"><label htmlFor="problem-difficulty">Difficulty</label><select id="problem-difficulty" value={formData.problemDifficulty} onChange={(event) => updateField('problemDifficulty', event.target.value)}><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
            <div className="form-field"><label htmlFor="problem-companies">Companies</label><input id="problem-companies" value={formData.problemCompanies} onChange={(event) => updateField('problemCompanies', event.target.value)} placeholder="Microsoft, Google, Amazon" /></div>
            <div className="solution-fields">
              <div className="solution-field"><span className="solution-label">01 / Brute force</span><textarea id="problem-brute-force" value={formData.bruteForceCode} onChange={(event) => updateField('bruteForceCode', event.target.value)} placeholder="Straightforward solution" /></div>
              <div className="solution-field"><span className="solution-label">02 / Good approach</span><textarea id="problem-good-approach" value={formData.goodApproachCode} onChange={(event) => updateField('goodApproachCode', event.target.value)} placeholder="Improved solution" /></div>
              <div className="solution-field"><span className="solution-label">03 / Optimal approach</span><textarea id="problem-optimal-approach" value={formData.optimalApproachCode} onChange={(event) => updateField('optimalApproachCode', event.target.value)} placeholder="Best known solution" /></div>
            </div>
            <div className="form-field"><label htmlFor="problem-notes">Notes</label><textarea id="problem-notes" value={formData.problemNotes} onChange={(event) => updateField('problemNotes', event.target.value)} placeholder="Add hints or takeaways" /></div>
            <div className="form-actions"><span className="form-hint">{visibleSubtopics.length ? `${visibleSubtopics.length} subtopic${visibleSubtopics.length === 1 ? '' : 's'} in this topic` : 'Choose a topic and add a subtopic first'}</span><button type="submit" className="solid-button" disabled={saving || !visibleSubtopics.length}>{saving ? 'Adding question...' : 'Add question'}</button></div>
            {!visibleSubtopics.length && <p className="form-hint">Add a subtopic first, then it will appear in this dropdown.</p>}
          </form>
        )}
      </div>
    </div>
  )
}
