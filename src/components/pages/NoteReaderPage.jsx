import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import Image from '@tiptap/extension-image'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../common/Loading'
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, BookOpen, Edit2, List } from 'lucide-react'
import { motion } from 'framer-motion'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
}
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
}

export default function NoteReaderPage() {
  const { subjectId, pageId } = useParams()
  const navigate = useNavigate()
  const [subject, setSubject] = useState(null)
  const [pages, setPages] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showToc, setShowToc] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: false, allowBase64: true }),
    ],
    editable: false,
    content: '',
    editorProps: {
      attributes: {
        class: 'reader-content outline-none px-8 sm:px-12 py-8',
      },
    },
  })

  useEffect(() => {
    const controller = new AbortController()

    const fetchPages = async () => {
      try {
        const { data: subjectData } = await supabase
          .from('notes_subjects')
          .select('name')
          .eq('id', subjectId)
          .single()
          .abortSignal(controller.signal)
          
        if (subjectData && !controller.signal.aborted) {
          setSubject(subjectData)
        }

        const { data, error } = await supabase
          .from('notes_pages')
          .select('*')
          .eq('subject_id', subjectId)
          .order('page_order', { ascending: true })
          .abortSignal(controller.signal)

        if (controller.signal.aborted) return
        if (error) throw error

        const allPages = data || []
        setPages(allPages)

        if (pageId && allPages.length) {
          const idx = allPages.findIndex(p => p.id === pageId)
          if (idx !== -1) setCurrentIndex(idx)
        }
      } catch (err) {
        if (!controller.signal.aborted) console.error('Error fetching notes:', err)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    fetchPages()
    return () => controller.abort()
  }, [subjectId, pageId])

  // Update editor content when page changes
  useEffect(() => {
    if (!editor || !pages.length) return
    const page = pages[currentIndex]
    if (page?.content) {
      editor.commands.setContent(page.content)
    } else {
      editor.commands.setContent('<p>This page is empty.</p>')
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [editor, pages, currentIndex])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(i => i - 1)
      } else if (e.key === 'ArrowRight' && currentIndex < pages.length - 1) {
        setCurrentIndex(i => i + 1)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [currentIndex, pages.length])

  if (loading) return <Loading />

  if (pages.length === 0) {
    return (
      <motion.div
        className="w-full max-w-4xl mx-auto pb-20"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <BookOpen size={48} className="text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No pages to read</h2>
          <p className="text-slate-500 mb-6">Create some notes first, then come back to read them.</p>
          <Link to={`/notes/subject/${subjectId}/edit`} className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors shadow-md">
            Create a Page
          </Link>
        </motion.div>
      </motion.div>
    )
  }

  const currentPage = pages[currentIndex]

  return (
    <motion.div
      className="w-full max-w-4xl mx-auto pb-20"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Top bar */}
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-6 gap-4">
        <Link to={`/notes/subject/${subjectId}`} className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors group text-sm font-medium">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to {subject ? subject.name : 'Subject'}
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowToc(!showToc)}
            className={`h-9 px-3 rounded-lg flex items-center gap-1.5 text-sm font-medium border transition-colors ${
              showToc ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <List size={15} /> Contents
          </button>
          <Link
            to={`/notes/subject/${subjectId}/edit/${currentPage.id}`}
            className="h-9 px-3 rounded-lg flex items-center gap-1.5 text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Edit2 size={14} /> Edit
          </Link>
        </div>
      </motion.div>

      {/* Table of Contents */}
      {showToc && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden"
        >
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Table of Contents</h3>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {pages.map((page, idx) => (
              <button
                key={page.id}
                onClick={() => { setCurrentIndex(idx); setShowToc(false) }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                  idx === currentIndex
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 font-medium'
                }`}
              >
                <span className="text-xs text-slate-400 w-6 shrink-0 font-mono">{idx + 1}.</span>
                <span className="truncate">{page.title || 'Untitled'}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Page header */}
      <motion.div variants={itemVariants} className="mb-2">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm font-medium text-slate-400">
            Page {currentIndex + 1} of {pages.length}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
          {currentPage.title || 'Untitled'}
        </h1>
      </motion.div>

      {/* Content */}
      <motion.div variants={itemVariants} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm mb-8">
        <EditorContent editor={editor} />
      </motion.div>

      {/* Pagination */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className={`group flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all ${
            currentIndex === 0
              ? 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
          }`}
        >
          <ChevronLeft size={18} className={currentIndex > 0 ? 'group-hover:-translate-x-0.5 transition-transform' : ''} />
          Previous
        </button>

        <div className="flex items-center gap-1.5">
          {pages.length <= 10 ? (
            pages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx === currentIndex
                    ? 'bg-indigo-600 scale-125 shadow-sm'
                    : 'bg-slate-200 hover:bg-slate-300'
                }`}
              />
            ))
          ) : (
            <span className="text-sm font-semibold text-slate-500">
              {currentIndex + 1} / {pages.length}
            </span>
          )}
        </div>

        <button
          onClick={() => setCurrentIndex(i => Math.min(pages.length - 1, i + 1))}
          disabled={currentIndex === pages.length - 1}
          className={`group flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all ${
            currentIndex === pages.length - 1
              ? 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md'
          }`}
        >
          Next
          <ChevronRight size={18} className={currentIndex < pages.length - 1 ? 'group-hover:translate-x-0.5 transition-transform' : ''} />
        </button>
      </motion.div>

      {/* Keyboard hint */}
      <motion.div variants={itemVariants} className="mt-6 text-center">
        <p className="text-xs text-slate-400 font-medium">
          Use <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 font-mono text-[10px]">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 font-mono text-[10px]">→</kbd> arrow keys to navigate
        </p>
      </motion.div>

      {/* Reader Content Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .reader-content {
          font-size: 1.05rem;
          line-height: 1.9;
          color: #1e293b;
        }
        .reader-content > *:first-child { margin-top: 0; }
        .reader-content h1 { font-size: 2em; font-weight: 800; margin: 1em 0 0.5em; color: #0f172a; letter-spacing: -0.025em; }
        .reader-content h2 { font-size: 1.5em; font-weight: 700; margin: 0.8em 0 0.4em; color: #1e293b; }
        .reader-content h3 { font-size: 1.25em; font-weight: 600; margin: 0.6em 0 0.3em; color: #334155; }
        .reader-content p { margin: 0.6em 0; }
        .reader-content ul { list-style: disc; padding-left: 1.5em; margin: 0.5em 0; }
        .reader-content ol { list-style: decimal; padding-left: 1.5em; margin: 0.5em 0; }
        .reader-content li { margin: 0.2em 0; }
        .reader-content li p { margin: 0.15em 0; }
        .reader-content blockquote {
          border-left: 4px solid #6366f1;
          padding: 0.75em 1em;
          margin: 1em 0;
          background: #f8fafc;
          border-radius: 0 0.75em 0.75em 0;
          color: #475569;
          font-style: italic;
        }
        .reader-content pre {
          background: #1e293b;
          color: #e2e8f0;
          padding: 1em 1.25em;
          border-radius: 0.75em;
          overflow-x: auto;
          margin: 1em 0;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 0.875em;
          line-height: 1.6;
        }
        .reader-content code {
          background: #f1f5f9;
          padding: 0.15em 0.4em;
          border-radius: 0.375em;
          font-size: 0.875em;
          color: #e11d48;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
        }
        .reader-content pre code { background: none; padding: 0; color: inherit; font-size: 1em; }
        .reader-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.75em;
          margin: 1.5em auto;
          display: block;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .reader-content hr {
          border: none;
          border-top: 2px solid #e2e8f0;
          margin: 2em 0;
        }
        .reader-content mark {
          border-radius: 0.25em;
          padding: 0.1em 0.2em;
        }
      `}} />
    </motion.div>
  )
}
