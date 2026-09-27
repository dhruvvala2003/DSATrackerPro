import { NodeViewWrapper } from '@tiptap/react'
import { AlignCenter, AlignLeft, AlignRight, CircleAlert, Trash2 } from 'lucide-react'
import { useUploadState } from '../uploads'

const WIDTHS = [
  { value: 33, label: 'S', title: 'Small' },
  { value: 50, label: 'M', title: 'Medium' },
  { value: 75, label: 'L', title: 'Large' },
  { value: 100, label: 'Full', title: 'Full width' },
]

const ALIGNS = [
  { value: 'left', icon: AlignLeft, title: 'Align left' },
  { value: 'center', icon: AlignCenter, title: 'Center' },
  { value: 'right', icon: AlignRight, title: 'Align right' },
]

const keepSelection = (event) => event.preventDefault()

/** Shared chrome for photos, videos and embeds: sizing, alignment, caption and upload progress. */
export default function MediaFrame({ node, editor, selected, getPos, updateAttributes, deleteNode, children }) {
  const { widthPct = 100, align = 'center', caption = '', uploadId } = node.attrs
  const editable = editor.isEditable
  const upload = useUploadState(uploadId)
  const interrupted = Boolean(uploadId) && !upload

  // An upload that never finished (e.g. the tab was closed): nothing to show readers.
  if (!editable && interrupted) return <NodeViewWrapper className="note-media note-media--hidden" />

  const exitCaption = (event) => {
    if (event.key !== 'Enter' && event.key !== 'Escape') return
    event.preventDefault()
    const after = getPos() + node.nodeSize
    const next = editor.state.doc.resolve(after).nodeAfter
    const chain = editor.chain().focus()
    if (next?.isTextblock) chain.setTextSelection(after + 1).run()
    else chain.insertContentAt(after, { type: 'paragraph' }).setTextSelection(after + 1).run()
  }

  return (
    <NodeViewWrapper className="note-media" data-align={align} data-drag-handle="">
      <figure className={`note-media__figure${selected && editable ? ' is-selected' : ''}`} style={{ width: `${widthPct}%` }}>
        <div className="note-media__body">
          {children}

          {upload && (
            <div className="note-media__overlay" contentEditable={false}>
              <div className="note-media__progress">
                <div className="note-media__progress-bar" style={{ width: `${Math.round(upload.progress * 100)}%` }} />
              </div>
              <span>{upload.progress >= 1 ? 'Finishing…' : `Uploading ${upload.kind === 'video' ? 'video' : 'photo'}… ${Math.round(upload.progress * 100)}%`}</span>
            </div>
          )}

          {interrupted && (
            <div className="note-media__overlay note-media__overlay--error" contentEditable={false}>
              <CircleAlert size={20} />
              <span>This upload didn’t finish.</span>
              <button type="button" onMouseDown={keepSelection} onClick={deleteNode}>Remove</button>
            </div>
          )}

          {editable && selected && !upload && (
            <div className="note-media__toolbar" contentEditable={false}>
              {WIDTHS.map((w) => (
                <button
                  key={w.value}
                  type="button"
                  title={w.title}
                  className={widthPct === w.value ? 'is-active' : ''}
                  onMouseDown={keepSelection}
                  onClick={() => updateAttributes({ widthPct: w.value })}
                >
                  {w.label}
                </button>
              ))}
              {widthPct < 100 && (
                <>
                  <span className="note-media__toolbar-sep" />
                  {ALIGNS.map(({ value, icon: Icon, title }) => (
                    <button
                      key={value}
                      type="button"
                      title={title}
                      className={align === value ? 'is-active' : ''}
                      onMouseDown={keepSelection}
                      onClick={() => updateAttributes({ align: value })}
                    >
                      <Icon size={14} />
                    </button>
                  ))}
                </>
              )}
              <span className="note-media__toolbar-sep" />
              <button type="button" title="Remove" className="is-danger" onMouseDown={keepSelection} onClick={deleteNode}>
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>

        {editable
          ? (selected || caption) && (
              <input
                className="note-media__caption-input"
                value={caption}
                placeholder="Add a caption…"
                onChange={(event) => updateAttributes({ caption: event.target.value })}
                onKeyDown={exitCaption}
              />
            )
          : caption && <figcaption className="note-media__caption">{caption}</figcaption>}
      </figure>
    </NodeViewWrapper>
  )
}
