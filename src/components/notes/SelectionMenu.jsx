import { useMemo, useState } from 'react'
import { useEditorState } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { NodeSelection } from '@tiptap/pm/state'
import { Bold, Check, Code, Heading2, Highlighter, Italic, Link2, Strikethrough, Underline, X } from 'lucide-react'
import { applyLink } from './linkUtils'

// Mounted on <body> so it floats above the sticky site header.
const appendToBody = () => document.body

function shouldShow({ editor, element, view, state, from, to }) {
  if (!editor.isEditable) return false
  const { selection } = state
  if (selection.empty || selection instanceof NodeSelection) return false
  if (editor.isActive('codeBlock')) return false
  if (!state.doc.textBetween(from, to, ' ').trim()) return false
  return view.hasFocus() || element.contains(document.activeElement)
}

function readSelectionState({ editor }) {
  if (!editor) return null
  return {
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    underline: editor.isActive('underline'),
    strike: editor.isActive('strike'),
    code: editor.isActive('code'),
    highlight: editor.isActive('highlight'),
    heading: editor.isActive('heading', { level: 2 }),
    link: editor.isActive('link') ? editor.getAttributes('link').href || '' : null,
  }
}

function BubbleButton({ active, title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`w-8 h-8 rounded-lg inline-flex items-center justify-center transition-colors ${
        active ? 'bg-white text-slate-900' : 'text-slate-200 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

export default function SelectionMenu({ editor }) {
  const [linkDraft, setLinkDraft] = useState(null) // null = buttons, string = editing a link
  const s = useEditorState({ editor, selector: readSelectionState })
  const options = useMemo(() => ({ placement: 'top', offset: 10, onHide: () => setLinkDraft(null) }), [])

  if (!editor || !s) return null
  const run = (fn) => fn(editor.chain().focus()).run()
  const submitLink = () => {
    applyLink(editor, linkDraft)
    setLinkDraft(null)
  }

  return (
    <BubbleMenu editor={editor} shouldShow={shouldShow} options={options} appendTo={appendToBody} className="z-[60]">
      <div className="flex items-center gap-0.5 rounded-xl bg-slate-900/95 backdrop-blur p-1 shadow-2xl shadow-slate-900/30 ring-1 ring-white/10">
        {linkDraft === null ? (
          <>
            <BubbleButton title="Heading" active={s.heading} onClick={() => run((c) => c.toggleHeading({ level: 2 }))}><Heading2 size={15} /></BubbleButton>
            <span className="w-px h-5 bg-white/15 mx-0.5" />
            <BubbleButton title="Bold" active={s.bold} onClick={() => run((c) => c.toggleBold())}><Bold size={15} /></BubbleButton>
            <BubbleButton title="Italic" active={s.italic} onClick={() => run((c) => c.toggleItalic())}><Italic size={15} /></BubbleButton>
            <BubbleButton title="Underline" active={s.underline} onClick={() => run((c) => c.toggleUnderline())}><Underline size={15} /></BubbleButton>
            <BubbleButton title="Strikethrough" active={s.strike} onClick={() => run((c) => c.toggleStrike())}><Strikethrough size={15} /></BubbleButton>
            <BubbleButton title="Inline code" active={s.code} onClick={() => run((c) => c.toggleCode())}><Code size={15} /></BubbleButton>
            <BubbleButton title="Highlight" active={s.highlight} onClick={() => run((c) => c.toggleHighlight({ color: '#FEF08A' }))}><Highlighter size={15} /></BubbleButton>
            <span className="w-px h-5 bg-white/15 mx-0.5" />
            <BubbleButton title="Link" active={s.link !== null} onClick={() => setLinkDraft(s.link || '')}><Link2 size={15} /></BubbleButton>
          </>
        ) : (
          <form
            className="flex items-center gap-1"
            onSubmit={(event) => {
              event.preventDefault()
              submitLink()
            }}
          >
            <input
              autoFocus
              value={linkDraft}
              onChange={(event) => setLinkDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault()
                  setLinkDraft(null)
                  editor.commands.focus()
                }
              }}
              placeholder="Paste a link…"
              className="w-56 h-8 px-2.5 rounded-lg bg-white/10 text-sm text-white placeholder-slate-400 outline-none focus:bg-white/15"
            />
            <BubbleButton title="Apply link" onClick={submitLink}>
              <Check size={15} />
            </BubbleButton>
            <BubbleButton title="Cancel" onClick={() => { setLinkDraft(null); editor.commands.focus() }}>
              <X size={15} />
            </BubbleButton>
          </form>
        )}
      </div>
    </BubbleMenu>
  )
}
