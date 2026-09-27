import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getSchema } from '@tiptap/core'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import { AnimatePresence } from 'framer-motion'
import { deletePage, trackWrite } from '../../lib/notesApi'
import { isDocEmpty, readingMinutes } from '../../lib/noteContent'
import EditorToolbar from './EditorToolbar'
import { runInsert } from './editorCommands'
import MediaDialog from './MediaDialog'
import SaveIndicator from './SaveIndicator'
import SelectionMenu from './SelectionMenu'
import { createNoteExtensions } from './extensions'
import { insertMediaFiles, registerLiveEditor } from './uploads'
import { useAutosave } from './useAutosave'
import './note-content.css'

const EDITOR_PROPS = {
  attributes: {
    class: 'note-content note-content--editor',
    'aria-label': 'Page content',
  },
}

function readWordCount({ editor }) {
  return editor ? editor.storage.characterCount.words() : 0
}

/**
 * The editing surface for one page. Mount it with `key={page.id}`: unmounting flushes any
 * pending save, and a brand-new page that was never touched is discarded.
 */
export default function NoteEditor({ page, initialTitle, initialContent, restored, justCreated, onTitleChange, onDiscard }) {
  const [title, setTitle] = useState(initialTitle)
  const [mediaRequest, setMediaRequest] = useState(null)
  const titleRef = useRef(initialTitle)
  const titleInputRef = useRef(null)
  const docRef = useRef(null)

  const getData = useCallback(
    () => ({ title: titleRef.current, content: docRef.current ? docRef.current.toJSON() : initialContent }),
    [initialContent],
  )
  const autosave = useAutosave(page.id, getData)
  const { controller } = autosave

  const extensions = useMemo(
    () => createNoteExtensions({
      editable: true,
      onOpenMedia: (kind) => setMediaRequest({ kind }),
      onFiles: (editor, files, pos) => insertMediaFiles(editor, files, { pageId: page.id, pos }),
    }),
    [page.id],
  )

  // TipTap silently loads an empty page when stored content doesn't fit the schema; saving that
  // would wipe the original. Detect it up front and keep such a page read-only instead.
  const contentProblem = useMemo(() => {
    if (!initialContent) return null
    try {
      getSchema(extensions).nodeFromJSON(initialContent).check()
      return null
    } catch (error) {
      console.error('Stored page content does not match the editor schema:', error)
      return error
    }
  }, [extensions, initialContent])

  const editor = useEditor({
    extensions,
    content: initialContent,
    editable: !contentProblem,
    editorProps: EDITOR_PROPS,
    onCreate: ({ editor: instance }) => { docRef.current = instance.state.doc },
    onUpdate: ({ editor: instance }) => {
      if (contentProblem) return
      docRef.current = instance.state.doc
      controller.markDirty()
    },
  })

  const words = useEditorState({ editor, selector: readWordCount }) || 0

  // Lets uploads that finish later find this editor.
  useEffect(() => (editor ? registerLiveEditor(page.id, editor) : undefined), [editor, page.id])

  // Unsaved edits recovered from this browser: push them to the server.
  useEffect(() => {
    if (restored && !contentProblem) controller.markDirty()
  }, [restored, contentProblem, controller])

  // Ctrl/Cmd+S saves immediately.
  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        controller.flush()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [controller])

  // A page created by "New page" and left without typing anything is removed again.
  // Only ever when it is still completely empty (the flag also survives browser Back/Forward).
  const discardable = justCreated && !initialTitle.trim() && isDocEmpty(initialContent)
  const aliveRef = useRef(false)
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      if (!discardable) return
      let done
      trackWrite(new Promise((resolve) => { done = resolve }))
      // Deferred so React StrictMode's simulated unmount/remount doesn't count as leaving.
      setTimeout(async () => {
        try {
          if (!aliveRef.current && controller.version === 0) {
            await deletePage(page.id)
            onDiscard?.(page.id)
          }
        } catch (error) {
          console.error('Could not discard empty page:', error)
        } finally {
          done()
        }
      }, 0)
    }
  }, [discardable, controller, page.id, onDiscard])

  // Grow the title field with its content.
  useLayoutEffect(() => {
    const el = titleInputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [title])

  const changeTitle = (value) => {
    if (contentProblem) return
    const next = value.replace(/\n/g, ' ')
    setTitle(next)
    titleRef.current = next
    controller.markDirty()
    onTitleChange?.(page.id, next)
  }

  const onTitleKeyDown = (event) => {
    const el = event.currentTarget
    const atEnd = el.selectionStart === el.value.length
    if (event.key === 'Enter' || (event.key === 'ArrowDown' && atEnd)) {
      event.preventDefault()
      editor?.commands.focus('start')
    }
  }

  // Clicking the empty space under the text puts the cursor at the end.
  const focusEndFromPadding = (event) => {
    if (event.target === event.currentTarget && editor) {
      event.preventDefault()
      editor.commands.focus('end')
    }
  }

  const closeMedia = useCallback(() => {
    setMediaRequest(null)
    editor?.commands.focus()
  }, [editor])

  return (
    <div className="relative rounded-3xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_48px_-32px_rgba(15,23,42,0.25)]">
      <EditorToolbar
        editor={editor}
        onOpenMedia={(kind) => setMediaRequest({ kind })}
        status={
          <SaveIndicator
            status={autosave.status}
            lastSavedAt={autosave.lastSavedAt}
            error={autosave.error}
            onRetry={controller.retryNow}
          />
        }
      />

      <div className="px-5 sm:px-10 lg:px-14 pt-10 pb-6 cursor-text" onMouseDown={focusEndFromPadding}>
        <div className="max-w-[760px] mx-auto" onMouseDown={focusEndFromPadding}>
          {contentProblem && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
              Part of this page couldn’t be read by the editor, so editing is locked to keep your original content safe.
            </div>
          )}
          <textarea
            ref={titleInputRef}
            value={title}
            rows={1}
            autoFocus={justCreated}
            onChange={(event) => changeTitle(event.target.value)}
            onKeyDown={onTitleKeyDown}
            placeholder="Untitled"
            aria-label="Page title"
            className="w-full resize-none overflow-hidden bg-transparent outline-none text-3xl sm:text-[2.6rem] leading-tight font-extrabold tracking-tight text-slate-900 placeholder-slate-300"
          />
          <div className="flex items-center gap-2 mt-3 mb-8 text-xs font-medium text-slate-400 select-none">
            <span>{words.toLocaleString()} {words === 1 ? 'word' : 'words'}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>{readingMinutes(words)} min read</span>
            <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-300" />
            <span className="hidden sm:inline">Type <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-500">/</kbd> for blocks · paste or drop photos</span>
          </div>
          <EditorContent editor={editor} />
        </div>
      </div>

      <SelectionMenu editor={editor} />

      {createPortal(
        <AnimatePresence>
          {mediaRequest && (
            <MediaDialog
              kind={mediaRequest.kind}
              onClose={closeMedia}
              onFiles={(files) => insertMediaFiles(editor, files, { pageId: page.id })}
              onInsert={(node) => editor && runInsert(editor, (chain) => chain.insertContent(node))}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}
