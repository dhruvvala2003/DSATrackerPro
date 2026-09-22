import { useState, useRef, useEffect } from 'react'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, Pilcrow,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered,
  ImageIcon, Code2, Quote, Minus,
  Undo2, Redo2, Palette, Highlighter
} from 'lucide-react'

const TEXT_COLORS = [
  '#000000', '#374151', '#6B7280', '#9CA3AF',
  '#EF4444', '#F97316', '#EAB308', '#84CC16',
  '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#EC4899',
]

const HIGHLIGHT_COLORS = [
  '#FEF08A', '#FED7AA', '#FECACA', '#BBF7D0',
  '#A7F3D0', '#BFDBFE', '#C7D2FE', '#DDD6FE',
  '#FBCFE8', '#E2E8F0',
]

function ColorPicker({ colors, activeColor, onSelect, icon: Icon, title }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen(!open)}
        title={title}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
          open ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
        }`}
      >
        <Icon size={16} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 p-2.5 bg-white rounded-xl border border-slate-200 shadow-xl z-50 grid grid-cols-4 gap-1.5 min-w-[148px]">
          {colors.map((color) => (
            <button
              key={color}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(color); setOpen(false) }}
              className={`w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 ${
                activeColor === color ? 'border-indigo-500 scale-110 shadow-sm' : 'border-transparent hover:border-slate-300'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onSelect(null); setOpen(false) }}
            className="w-7 h-7 rounded-lg border-2 border-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold hover:scale-110 transition-transform hover:border-rose-300 hover:text-rose-500"
            title="Remove"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

export default function EditorToolbar({ editor }) {
  const [imageUrl, setImageUrl] = useState('')
  const [showImageInput, setShowImageInput] = useState(false)
  const imageRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (imageRef.current && !imageRef.current.contains(e.target)) setShowImageInput(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!editor) return null

  const addImage = () => {
    if (imageUrl.trim()) {
      editor.chain().focus().setImage({ src: imageUrl.trim() }).run()
      setImageUrl('')
      setShowImageInput(false)
    }
  }

  const Btn = ({ onClick, active, children, title }) => (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
        active
          ? 'bg-indigo-100 text-indigo-700 shadow-sm'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  )

  const Sep = () => <div className="w-px h-6 bg-slate-200 mx-1 shrink-0" />

  return (
    <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-2">
      <div className="flex items-center gap-0.5 flex-wrap">
        <Btn onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo2 size={16} /></Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo2 size={16} /></Btn>
        <Sep />

        <Btn onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')} title="Paragraph"><Pilcrow size={16} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1"><Heading1 size={16} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2"><Heading2 size={16} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3"><Heading3 size={16} /></Btn>
        <Sep />

        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)"><Bold size={16} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)"><Italic size={16} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)"><UnderlineIcon size={16} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><Strikethrough size={16} /></Btn>
        <Sep />

        <ColorPicker
          colors={TEXT_COLORS}
          activeColor={editor.getAttributes('textStyle').color}
          onSelect={(c) => c ? editor.chain().focus().setColor(c).run() : editor.chain().focus().unsetColor().run()}
          icon={Palette}
          title="Text color"
        />
        <ColorPicker
          colors={HIGHLIGHT_COLORS}
          activeColor={editor.getAttributes('highlight').color}
          onSelect={(c) => c ? editor.chain().focus().toggleHighlight({ color: c }).run() : editor.chain().focus().unsetHighlight().run()}
          icon={Highlighter}
          title="Highlight"
        />
        <Sep />

        <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left"><AlignLeft size={16} /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Center"><AlignCenter size={16} /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right"><AlignRight size={16} /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify"><AlignJustify size={16} /></Btn>
        <Sep />

        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list"><List size={16} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list"><ListOrdered size={16} /></Btn>
        <Sep />

        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote"><Quote size={16} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block"><Code2 size={16} /></Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus size={16} /></Btn>

        <div className="relative" ref={imageRef}>
          <Btn onClick={() => setShowImageInput(!showImageInput)} title="Insert image"><ImageIcon size={16} /></Btn>
          {showImageInput && (
            <div className="absolute top-full right-0 mt-2 p-3 bg-white rounded-xl border border-slate-200 shadow-xl z-50 w-80">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Image URL</p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && addImage()}
                  autoFocus
                />
                <button
                  onClick={addImage}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Insert
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
