import { NodeSelection } from '@tiptap/pm/state'

/**
 * When a photo/video/embed (or any block) is selected, move the cursor to a paragraph right after
 * it. Otherwise inserting a new block would replace the selected one — e.g. adding a YouTube video
 * while a photo is selected would delete the photo.
 */
export function placeCursorAfterSelectedNode(editor) {
  const { selection, doc } = editor.state
  if (!(selection instanceof NodeSelection)) return
  const after = selection.to
  const next = doc.resolve(after).nodeAfter
  if (next?.isTextblock && next.content.size === 0) {
    editor.commands.setTextSelection(after + 1)
  } else {
    editor.chain().insertContentAt(after, { type: 'paragraph' }).setTextSelection(after + 1).run()
  }
}

/** Runs an insert command (`fn(chain)`) without overwriting a selected block. */
export function runInsert(editor, fn) {
  placeCursorAfterSelectedNode(editor)
  return fn(editor.chain().focus()).run()
}
