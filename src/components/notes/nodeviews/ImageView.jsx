import { ImageIcon } from 'lucide-react'
import MediaFrame from './MediaFrame'

export default function ImageView(props) {
  const { src, alt, caption } = props.node.attrs
  return (
    <MediaFrame {...props}>
      {src ? (
        <img src={src} alt={alt || caption || ''} draggable={false} loading="lazy" className="note-image" />
      ) : (
        <div className="note-media__empty"><ImageIcon size={28} /></div>
      )}
    </MediaFrame>
  )
}
