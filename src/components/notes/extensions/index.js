import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import Placeholder from '@tiptap/extension-placeholder'
import { TableKit } from '@tiptap/extension-table'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { CharacterCount } from '@tiptap/extensions'
import { ReactNodeViewRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { lowlight } from '../lowlight'
import CodeBlockView from '../nodeviews/CodeBlockView'
import { Callout } from './callout'
import { FontSize } from './fontSize'
import { Embed, NoteImage, Video } from './media'
import { MediaDropPaste } from './mediaDropPaste'
import { SlashCommand } from './slashCommand'

const NoteCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView)
  },
})

function placeholderText({ editor, node }) {
  if (node.type.name === 'heading') return `Heading ${node.attrs.level}`
  if (node.type.name !== 'paragraph') return ''
  return editor.isEmpty
    ? 'Start writing… type “/” for headings, code, tables, photos & videos'
    : 'Type “/” for commands'
}

/**
 * One extension list for both the editor and the reader, so a page renders exactly as it was written.
 * `onOpenMedia(kind)` opens the photo/video dialog; `onFiles(editor, files, pos)` uploads pasted/dropped files.
 */
export function createNoteExtensions({ editable = true, onOpenMedia, onFiles } = {}) {
  const extensions = [
    // StarterKit v3 already includes Underline and Link.
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: false,
      dropcursor: { color: '#6366f1', width: 3 },
      link: {
        openOnClick: !editable,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer nofollow' },
      },
    }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    NoteImage.configure({ inline: false, allowBase64: true }),
    Video,
    Embed,
    Callout,
    FontSize,
    TaskList,
    TaskItem.configure({ nested: true }),
    TableKit.configure({ table: { resizable: false } }),
    NoteCodeBlock.configure({ lowlight, defaultLanguage: null, enableTabIndentation: true, tabSize: 4 }),
    CharacterCount,
  ]

  if (editable) {
    extensions.push(
      Placeholder.configure({ placeholder: placeholderText, includeChildren: true }),
      SlashCommand.configure({ onOpenMedia }),
      MediaDropPaste.configure({ onFiles }),
    )
  }

  return extensions
}
