import { useEffect, useMemo } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { createNoteExtensions } from './extensions'
import './note-content.css'

const READER_PROPS = { attributes: { class: 'note-content note-content--reader' } }

/** Renders a saved page with the same extensions as the editor. Mount with `key={page.id}`. */
export default function ReadOnlyNote({ content }) {
  const parsedContent = useMemo(() => {
    if (!content) return null
    if (typeof content === 'string') {
      try {
        return JSON.parse(content)
      } catch {
        return content
      }
    }
    return content
  }, [content])

  const extensions = useMemo(() => createNoteExtensions({ editable: false }), [])
  const editor = useEditor(
    {
      extensions,
      content: parsedContent,
      editable: false,
      editorProps: READER_PROPS,
    },
    [parsedContent]
  )

  useEffect(() => {
    if (editor && parsedContent && !editor.isDestroyed) {
      if (JSON.stringify(editor.getJSON()) !== JSON.stringify(parsedContent)) {
        editor.commands.setContent(parsedContent)
      }
    }
  }, [editor, parsedContent])

  if (!editor) return null

  return <EditorContent editor={editor} />
}

