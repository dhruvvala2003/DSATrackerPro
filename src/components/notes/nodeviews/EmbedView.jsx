import { ExternalLink } from 'lucide-react'
import { EMBED_PROVIDERS, isAllowedEmbedSrc } from '../../../lib/mediaUpload'
import MediaFrame from './MediaFrame'

export default function EmbedView(props) {
  const { src, provider, url } = props.node.attrs
  const editable = props.editor.isEditable
  const name = EMBED_PROVIDERS[provider] || 'Video'

  return (
    <MediaFrame {...props}>
      <div className="note-embed">
        {isAllowedEmbedSrc(src) ? (
          <iframe
            src={src}
            title={`${name} video`}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <a className="note-embed__fallback" href={url || '#'} target="_blank" rel="noopener noreferrer nofollow">
            <ExternalLink size={16} /> Open video
          </a>
        )}
        {/* While editing, the first click selects the embed instead of starting the player. */}
        {editable && !props.selected && <div className="note-embed__shield" title={`${name} — click to select`} />}
      </div>
    </MediaFrame>
  )
}
