import { useMemo } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { createNoteExtensions } from './extensions'
import './note-content.css'

const READER_PROPS = { attributes: { class: 'note-content note-content--reader' } }

/** Renders a saved page with the same extensions as the editor. Mount with `key={page.id}`. */
export default function ReadOnlyNote({ content }) {
  const extensions = useMemo(() => createNoteExtensions({ editable: false }), [])
  const editor = useEditor({ extensions, content, editable: false, editorProps: READER_PROPS })
  return <EditorContent editor={editor} />
}
