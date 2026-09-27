import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEditorState } from '@tiptap/react'
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Baseline, Bold, ChevronDown, Code2, Flame, Highlighter,
  ImageIcon, Info, Italic, Lightbulb, Link2, List, ListChecks, ListOrdered, Minus, Quote, Redo2,
  Table, TriangleAlert, Underline, Undo2, Video,
} from 'lucide-react'
import { runInsert } from './editorCommands'
import { applyLink } from './linkUtils'
import { getLastCodeLanguage } from './lowlight'

const TEXT_COLORS = [
  '#0F172A', '#475569', '#94A3B8', '#DC2626', '#EA580C', '#CA8A04',
  '#16A34A', '#0D9488', '#0284C7', '#4F46E5', '#7C3AED', '#DB2777',
]
const HIGHLIGHT_COLORS = ['#FEF08A', '#FED7AA', '#FECACA', '#BBF7D0', '#A5F3FC', '#BFDBFE', '#DDD6FE', '#FBCFE8']

const BLOCK_TYPES = [
  { value: 'p', label: 'Text', run: (c) => c.setParagraph() },
  { value: 'h1', label: 'Heading 1', run: (c) => c.setHeading({ level: 1 }) },
  { value: 'h2', label: 'Heading 2', run: (c) => c.setHeading({ level: 2 }) },
  { value: 'h3', label: 'Heading 3', run: (c) => c.setHeading({ level: 3 }) },
]

const ALIGNMENTS = [
  { value: 'left', label: 'Left', icon: AlignLeft },
  { value: 'center', label: 'Center', icon: AlignCenter },
  { value: 'right', label: 'Right', icon: AlignRight },
  { value: 'justify', label: 'Justify', icon: AlignJustify },
]

const CALLOUTS = [
  { value: 'note', label: 'Note', icon: Info, className: 'text-indigo-600' },
  { value: 'tip', label: 'Tip', icon: Lightbulb, className: 'text-emerald-600' },
  { value: 'warning', label: 'Warning', icon: TriangleAlert, className: 'text-amber-600' },
  { value: 'important', label: 'Important', icon: Flame, className: 'text-rose-600' },
]

const TABLE_ACTIONS = [
  { label: 'Add row above', run: (c) => c.addRowBefore() },
  { label: 'Add row below', run: (c) => c.addRowAfter() },
  { label: 'Add column left', run: (c) => c.addColumnBefore() },
  { label: 'Add column right', run: (c) => c.addColumnAfter() },
  { label: 'Toggle header row', run: (c) => c.toggleHeaderRow() },
  { label: 'Delete row', run: (c) => c.deleteRow(), danger: true },
  { label: 'Delete column', run: (c) => c.deleteColumn(), danger: true },
  { label: 'Delete table', run: (c) => c.deleteTable(), danger: true },
]

const keepEditorFocus = (event) => event.preventDefault()

function ToolButton({ onClick, active, accent, disabled, title, children }) {
  const tone = active
    ? 'bg-indigo-100 text-indigo-700'
    : accent
      ? 'text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={keepEditorFocus}
      onClick={onClick}
      className={`h-8 min-w-8 px-1.5 shrink-0 rounded-lg inline-flex items-center justify-center gap-1 text-sm font-medium transition-colors disabled:opacity-30 disabled:pointer-events-none ${tone}`}
    >
      {children}
    </button>
  )
}

function Separator() {
  return <span className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" aria-hidden="true" />
}

// Panels render in a portal with fixed positioning, so the toolbar can scroll horizontally
// on phones without clipping them.
function Dropdown({ title, active, button, children }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)

  const place = useCallback(() => {
    const trigger = triggerRef.current?.getBoundingClientRect()
    const panel = panelRef.current
    if (!trigger || !panel) return
    const maxLeft = window.innerWidth - panel.offsetWidth - 8
    panel.style.top = `${trigger.bottom + 8}px`
    panel.style.left = `${Math.max(8, Math.min(trigger.left, maxLeft))}px`
  }, [])

  useLayoutEffect(() => {
    if (open) place()
  }, [open, place])

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => {
      if (!triggerRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, place])

  return (
    <div className="shrink-0" ref={triggerRef}>
      <ToolButton title={title} active={active || open} onClick={() => setOpen((value) => !value)}>
        {button}
        <ChevronDown size={12} className="opacity-50 -ml-0.5" />
      </ToolButton>
      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[70] max-w-[calc(100vw-16px)] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10"
          onMouseDown={(event) => { if (event.target.tagName !== 'INPUT') event.preventDefault() }}
        >
          {children(() => setOpen(false))}
        </div>,
        document.body,
      )}
    </div>
  )
}

function MenuItem({ onClick, active, danger, icon: Icon, iconClassName = '', children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm text-left whitespace-nowrap transition-colors ${
        active ? 'bg-indigo-50 text-indigo-700 font-semibold' : danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      {Icon && <Icon size={15} className={iconClassName} />}
      {children}
    </button>
  )
}

function Swatches({ colors, active, onSelect, onClear, clearLabel }) {
  return (
    <div className="w-[196px]">
      <div className="grid grid-cols-6 gap-1.5 p-1">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            title={color}
            onClick={() => onSelect(color)}
            className={`w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 ${
              active?.toLowerCase() === color.toLowerCase() ? 'border-indigo-500 scale-110' : 'border-white shadow-[0_0_0_1px_#e2e8f0]'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <button type="button" onClick={onClear} className="mt-1 w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 text-left">
        {clearLabel}
      </button>
    </div>
  )
}

function LinkPanel({ editor, currentHref, close }) {
  const [href, setHref] = useState(currentHref || '')

  const apply = () => {
    applyLink(editor, href)
    close()
  }

  return (
    <form className="w-72 p-1.5" onSubmit={(event) => { event.preventDefault(); apply() }}>
      <p className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Link</p>
      <input
        autoFocus
        value={href}
        onChange={(event) => setHref(event.target.value)}
        placeholder="Paste or type a link…"
        className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />
      <div className="flex justify-end gap-2 mt-2">
        {currentHref && (
          <button type="button" onClick={() => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); close() }} className="h-8 px-3 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50">
            Remove
          </button>
        )}
        <button type="submit" className="h-8 px-4 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
          Apply
        </button>
      </div>
    </form>
  )
}

function readToolbarState({ editor }) {
  if (!editor) return null
  const heading = [1, 2, 3].find((level) => editor.isActive('heading', { level }))
  return {
    block: heading ? `h${heading}` : 'p',
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    underline: editor.isActive('underline'),
    link: editor.isActive('link') ? editor.getAttributes('link').href || '' : null,
    color: editor.getAttributes('textStyle').color || null,
    highlight: editor.isActive('highlight') ? editor.getAttributes('highlight').color || '#FEF08A' : null,
    align: ['center', 'right', 'justify'].find((value) => editor.isActive({ textAlign: value })) || 'left',
    bulletList: editor.isActive('bulletList'),
    orderedList: editor.isActive('orderedList'),
    taskList: editor.isActive('taskList'),
    blockquote: editor.isActive('blockquote'),
    codeBlock: editor.isActive('codeBlock'),
    callout: editor.isActive('callout') ? editor.getAttributes('callout').variant : null,
    table: editor.isActive('table'),
    canUndo: editor.can().undo(),
    canRedo: editor.can().redo(),
  }
}

export default function EditorToolbar({ editor, onOpenMedia, status }) {
  const s = useEditorState({ editor, selector: readToolbarState })
  if (!editor || !s) return null

  const run = (fn) => fn(editor.chain().focus()).run()
  const blockLabel = BLOCK_TYPES.find((type) => type.value === s.block)?.label || 'Text'
  const AlignIcon = ALIGNMENTS.find((a) => a.value === s.align)?.icon || AlignLeft

  return (
    <div className="sticky top-16 z-30 rounded-t-3xl border-b border-slate-200/80 bg-white/90 backdrop-blur-xl flex items-center gap-2 pl-2 pr-3 sm:px-3 py-2">
      {/* One swipeable row on phones; wraps on wider screens. */}
      <div className="flex-1 min-w-0 flex items-center gap-0.5 overflow-x-auto sm:flex-wrap sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ToolButton title="Undo (Ctrl+Z)" disabled={!s.canUndo} onClick={() => run((c) => c.undo())}><Undo2 size={16} /></ToolButton>
        <ToolButton title="Redo (Ctrl+Shift+Z)" disabled={!s.canRedo} onClick={() => run((c) => c.redo())}><Redo2 size={16} /></ToolButton>
        <Separator />

        <Dropdown title="Text style" button={<span className="w-[68px] text-left truncate">{blockLabel}</span>}>
          {(close) => BLOCK_TYPES.map((type) => (
            <MenuItem key={type.value} active={s.block === type.value} onClick={() => { run(type.run); close() }}>
              <span className={type.value === 'h1' ? 'text-lg font-bold' : type.value === 'h2' ? 'text-base font-bold' : type.value === 'h3' ? 'font-semibold' : ''}>{type.label}</span>
            </MenuItem>
          ))}
        </Dropdown>
        <Separator />

        <ToolButton title="Bold (Ctrl+B)" active={s.bold} onClick={() => run((c) => c.toggleBold())}><Bold size={16} /></ToolButton>
        <ToolButton title="Italic (Ctrl+I)" active={s.italic} onClick={() => run((c) => c.toggleItalic())}><Italic size={16} /></ToolButton>
        <ToolButton title="Underline (Ctrl+U)" active={s.underline} onClick={() => run((c) => c.toggleUnderline())}><Underline size={16} /></ToolButton>
        {/* Strikethrough and inline code live in the selection menu (select text) to keep this row short. */}
        <Dropdown title="Link" active={s.link !== null} button={<Link2 size={16} />}>
          {(close) => <LinkPanel editor={editor} currentHref={s.link} close={close} />}
        </Dropdown>

        <Dropdown title="Text colour" active={!!s.color} button={<Baseline size={16} style={s.color ? { color: s.color } : undefined} />}>
          {(close) => (
            <Swatches
              colors={TEXT_COLORS}
              active={s.color}
              clearLabel="Default colour"
              onSelect={(color) => { run((c) => c.setColor(color)); close() }}
              onClear={() => { run((c) => c.unsetColor()); close() }}
            />
          )}
        </Dropdown>
        <Dropdown title="Highlight" active={!!s.highlight} button={<Highlighter size={16} />}>
          {(close) => (
            <Swatches
              colors={HIGHLIGHT_COLORS}
              active={s.highlight}
              clearLabel="No highlight"
              onSelect={(color) => { run((c) => c.setHighlight({ color })); close() }}
              onClear={() => { run((c) => c.unsetHighlight()); close() }}
            />
          )}
        </Dropdown>
        <Separator />

        <Dropdown title="Alignment" active={s.align !== 'left'} button={<AlignIcon size={16} />}>
          {(close) => ALIGNMENTS.map(({ value, label, icon }) => (
            <MenuItem key={value} icon={icon} active={s.align === value} onClick={() => { run((c) => c.setTextAlign(value)); close() }}>{label}</MenuItem>
          ))}
        </Dropdown>
        <ToolButton title="Bulleted list" active={s.bulletList} onClick={() => run((c) => c.toggleBulletList())}><List size={16} /></ToolButton>
        <ToolButton title="Numbered list" active={s.orderedList} onClick={() => run((c) => c.toggleOrderedList())}><ListOrdered size={16} /></ToolButton>
        <ToolButton title="Checklist" active={s.taskList} onClick={() => run((c) => c.toggleTaskList())}><ListChecks size={16} /></ToolButton>
        <Separator />

        <ToolButton title="Quote" active={s.blockquote} onClick={() => run((c) => c.toggleBlockquote())}><Quote size={16} /></ToolButton>
        <ToolButton
          title="Code block"
          active={s.codeBlock}
          onClick={() => run((c) => (s.codeBlock ? c.toggleCodeBlock() : c.setCodeBlock({ language: getLastCodeLanguage() })))}
        >
          <Code2 size={16} />
        </ToolButton>
        <Dropdown title="Callout box" active={!!s.callout} button={<Lightbulb size={16} />}>
          {(close) => (
            <>
              {CALLOUTS.map(({ value, label, icon, className }) => (
                <MenuItem key={value} icon={icon} iconClassName={className} active={s.callout === value} onClick={() => { run((c) => c.setCallout({ variant: value })); close() }}>
                  {label}
                </MenuItem>
              ))}
              {s.callout && <MenuItem danger onClick={() => { run((c) => c.unsetCallout()); close() }}>Remove callout</MenuItem>}
            </>
          )}
        </Dropdown>
        <Dropdown title="Table" active={s.table} button={<Table size={16} />}>
          {(close) => (s.table
            ? TABLE_ACTIONS.map((action) => (
                <MenuItem key={action.label} danger={action.danger} onClick={() => { run(action.run); close() }}>{action.label}</MenuItem>
              ))
            : (
              <MenuItem icon={Table} onClick={() => { runInsert(editor, (c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true })); close() }}>
                Insert 3 × 3 table
              </MenuItem>
            ))}
        </Dropdown>
        <ToolButton title="Divider" onClick={() => runInsert(editor, (c) => c.setHorizontalRule())}><Minus size={16} /></ToolButton>
        <Separator />

        {/* YouTube / Vimeo links are in the Video dialog (and the "/" menu). */}
        <ToolButton accent title="Add photo" onClick={() => onOpenMedia('image')}>
          <ImageIcon size={16} />
        </ToolButton>
        <ToolButton accent title="Add video or YouTube link" onClick={() => onOpenMedia('video')}>
          <Video size={16} />
        </ToolButton>
      </div>
      {status && <div className="shrink-0 flex items-center">{status}</div>}
    </div>
  )
}
