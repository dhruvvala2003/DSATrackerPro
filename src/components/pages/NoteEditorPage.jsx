import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { supabase } from '../../lib/supabaseClient'
import EditorToolbar from '../notes/EditorToolbar'
import Loading from '../common/Loading'
import { ArrowLeft, Check, Loader2, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
}
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
}

export default function NoteEditorPage() {
  const { subjectId, pageId } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [saveStatus, setSaveStatus] = useState('idle')
  const [pageData, setPageData] = useState(null)
  const [loading, setLoading] = useState(!!pageId)
  const [subjectName, setSubjectName] = useState('')
  const saveTimer = useRef(null)
  const pageDataRef = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: 'Start writing your notes here…' }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'tiptap-content outline-none min-h-[500px] px-8 py-6',
      },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files
        if (files?.length) {
          event.preventDefault()
          Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
              const reader = new FileReader()
              reader.onload = (e) => {
                view.dispatch(view.state.tr.replaceSelectionWith(
                  view.state.schema.nodes.image.create({ src: e.target.result })
                ))
              }
              reader.readAsDataURL(file)
            }
          })
          return true
        }
        return false
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items
        if (items) {
          for (const item of items) {
            if (item.type.startsWith('image/')) {
              event.preventDefault()
              const file = item.getAsFile()
              if (file) {
                const reader = new FileReader()
                reader.onload = (e) => {
                  view.dispatch(view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src: e.target.result })
                  ))
                }
                reader.readAsDataURL(file)
              }
              return true
            }
          }
        }
        return false
      },
    },
  })

  // Load existing page & subject name
  useEffect(() => {
    const controller = new AbortController()

    const loadData = async () => {
      try {
        if (subjectId) {
          const { data } = await supabase.from('notes_subjects').select('name').eq('id', subjectId).single().abortSignal(controller.signal)
          if (data && !controller.signal.aborted) setSubjectName(data.name)
        }

        if (!pageId || !editor) {
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('notes_pages')
          .select('*')
          .eq('id', pageId)
          .single()
          .abortSignal(controller.signal)

        if (controller.signal.aborted) return
        if (error) throw error
        if (data) {
          setPageData(data)
          pageDataRef.current = data
          setTitle(data.title || '')
          if (data.content) editor.commands.setContent(data.content)
        }
      } catch (err) {
        if (!controller.signal.aborted) console.error('Load error:', err)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadData()
    return () => controller.abort()
  }, [pageId, subjectId, editor])

  // Save function
  const saveContent = useCallback(async (currentTitle) => {
    const t = currentTitle ?? title
    if (!t.trim() || !editor || !subjectId) return

    setSaveStatus('saving')
    const content = editor.getJSON()

    try {
      const current = pageDataRef.current
      if (current?.id) {
        const { error } = await supabase
          .from('notes_pages')
          .update({ title: t.trim(), content, updated_at: new Date().toISOString() })
          .eq('id', current.id)
        if (error) throw error
      } else {
        const { data: maxData } = await supabase
          .from('notes_pages')
          .select('page_order')
          .order('page_order', { ascending: false })
          .limit(1)

        const nextOrder = (maxData?.[0]?.page_order ?? -1) + 1

        const { data, error } = await supabase
          .from('notes_pages')
          .insert({ subject_id: subjectId, title: t.trim(), content, page_order: nextOrder })
          .select()
          .single()

        if (error) throw error
        if (data) {
          setPageData(data)
          pageDataRef.current = data
          window.history.replaceState(null, '', `/notes/subject/${subjectId}/edit/${data.id}`)
        }
      }
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus((s) => s === 'saved' ? 'idle' : s), 2500)
    } catch (err) {
      console.error('Save error:', err)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [title, subjectId, editor])

  // Auto-save on content change
  useEffect(() => {
    if (!editor) return

    const handleUpdate = () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        if (title.trim()) saveContent()
      }, 1500)
    }

    editor.on('update', handleUpdate)
    return () => {
      editor.off('update', handleUpdate)
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [editor, saveContent, title])

  // Save on title blur
  const handleTitleBlur = () => {
    if (title.trim() && (pageDataRef.current || editor?.getText().trim())) {
      saveContent()
    }
  }

  // Ctrl+S manual save
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (title.trim()) saveContent()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [saveContent, title])

  if (loading) return <Loading />

  return (
    <motion.div
      className="w-full max-w-5xl mx-auto pb-20"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-6">
        <Link to={`/notes/subject/${subjectId}`} className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-6 group text-sm font-medium">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to {subjectName || 'Subject'}
        </Link>
      </motion.div>

      {/* Title & Meta */}
      <motion.div variants={itemVariants} className="mb-6 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Untitled Page"
            className="w-full text-3xl md:text-4xl font-extrabold text-slate-900 bg-transparent outline-none placeholder-slate-300 tracking-tight"
          />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            saveStatus === 'saving' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
            saveStatus === 'saved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
            saveStatus === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
            'bg-slate-50 text-slate-400 border border-slate-200'
          }`}>
            {saveStatus === 'saving' && <><Loader2 size={12} className="animate-spin" /> Saving…</>}
            {saveStatus === 'saved' && <><Check size={12} /> Saved</>}
            {saveStatus === 'error' && <><AlertCircle size={12} /> Error</>}
            {saveStatus === 'idle' && 'Auto-save on'}
          </div>
        </div>
      </motion.div>

      {/* Editor */}
      <motion.div variants={itemVariants} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <EditorToolbar editor={editor} />
        <EditorContent editor={editor} />
      </motion.div>

      {/* TipTap Content Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .tiptap-content {
          font-size: 1rem;
          line-height: 1.8;
          color: #1e293b;
        }
        .tiptap-content > *:first-child { margin-top: 0; }
        .tiptap-content h1 { font-size: 2em; font-weight: 800; margin: 1em 0 0.5em; color: #0f172a; letter-spacing: -0.025em; }
        .tiptap-content h2 { font-size: 1.5em; font-weight: 700; margin: 0.8em 0 0.4em; color: #1e293b; }
        .tiptap-content h3 { font-size: 1.25em; font-weight: 600; margin: 0.6em 0 0.3em; color: #334155; }
        .tiptap-content p { margin: 0.6em 0; }
        .tiptap-content ul { list-style: disc; padding-left: 1.5em; margin: 0.5em 0; }
        .tiptap-content ol { list-style: decimal; padding-left: 1.5em; margin: 0.5em 0; }
        .tiptap-content li { margin: 0.2em 0; }
        .tiptap-content li p { margin: 0.15em 0; }
        .tiptap-content blockquote {
          border-left: 4px solid #6366f1;
          padding: 0.75em 1em;
          margin: 1em 0;
          background: #f8fafc;
          border-radius: 0 0.75em 0.75em 0;
          color: #475569;
          font-style: italic;
        }
        .tiptap-content pre {
          background: #1e293b;
          color: #e2e8f0;
          padding: 1em 1.25em;
          border-radius: 0.75em;
          overflow-x: auto;
          margin: 1em 0;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 0.9em;
          line-height: 1.6;
        }
        .tiptap-content code {
          background: #f1f5f9;
          padding: 0.15em 0.4em;
          border-radius: 0.375em;
          font-size: 0.875em;
          color: #e11d48;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
        }
        .tiptap-content pre code { background: none; padding: 0; color: inherit; font-size: 1em; }
        .tiptap-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.75em;
          margin: 1.5em auto;
          display: block;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .tiptap-content hr {
          border: none;
          border-top: 2px solid #e2e8f0;
          margin: 2em 0;
        }
        .tiptap-content mark {
          border-radius: 0.25em;
          padding: 0.1em 0.2em;
        }
        .tiptap-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
          float: left;
          height: 0;
        }
      `}} />
    </motion.div>
  )
}
