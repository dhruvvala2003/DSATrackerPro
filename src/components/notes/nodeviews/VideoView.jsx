import { Film } from 'lucide-react'
import MediaFrame from './MediaFrame'

export default function VideoView(props) {
  const { src } = props.node.attrs
  return (
    <MediaFrame {...props}>
      {src ? (
        <video src={src} controls preload="metadata" playsInline className="note-video" />
      ) : (
        <div className="note-media__empty note-media__empty--video"><Film size={28} /></div>
      )}
    </MediaFrame>
  )
}
