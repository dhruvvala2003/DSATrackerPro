import { Node, mergeAttributes } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { isAllowedEmbedSrc, parseEmbedUrl } from '../../../lib/mediaUpload'
import EmbedView from '../nodeviews/EmbedView'
import ImageView from '../nodeviews/ImageView'
import VideoView from '../nodeviews/VideoView'

function embedSrcFrom(el) {
  const raw = el.getAttribute('src')
  return isAllowedEmbedSrc(raw) ? raw : parseEmbedUrl(raw)?.src ?? null
}

const ALIGNMENTS = ['left', 'center', 'right']
const WIDTHS = [33, 50, 75, 100]

// Layout attributes shared by photos, videos and embeds.
function layoutAttributes() {
  return {
    caption: {
      default: '',
      parseHTML: (el) => el.getAttribute('data-caption') || '',
      renderHTML: (attrs) => (attrs.caption ? { 'data-caption': attrs.caption } : {}),
    },
    widthPct: {
      default: 100,
      parseHTML: (el) => {
        const width = Number(el.getAttribute('data-width'))
        return WIDTHS.includes(width) ? width : 100
      },
      renderHTML: (attrs) => ({ 'data-width': attrs.widthPct }),
    },
    align: {
      default: 'center',
      parseHTML: (el) => (ALIGNMENTS.includes(el.getAttribute('data-align')) ? el.getAttribute('data-align') : 'center'),
      renderHTML: (attrs) => ({ 'data-align': attrs.align }),
    },
    // Set while the file is uploading; kept in the saved JSON so a finished upload can find its node.
    uploadId: { default: null, rendered: false },
  }
}

export const NoteImage = Image.extend({
  addAttributes() {
    return { ...this.parent?.(), ...layoutAttributes() }
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView)
  },
})

export const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      ...layoutAttributes(),
    }
  },

  parseHTML() {
    return [{ tag: 'video[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes({ controls: 'true', preload: 'metadata', playsinline: 'true' }, HTMLAttributes)]
  },

  addCommands() {
    return {
      setVideo: (attrs) => ({ commands }) => commands.insertContent({ type: this.name, attrs }),
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoView)
  },
})

// YouTube / Vimeo / Loom / Google Drive players. Only known providers' player URLs are ever embedded.
export const Embed = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null, parseHTML: (el) => embedSrcFrom(el) },
      provider: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-provider') || parseEmbedUrl(el.getAttribute('src'))?.provider || null,
      },
      url: { default: null, parseHTML: (el) => el.getAttribute('data-url') },
      ...layoutAttributes(),
    }
  },

  parseHTML() {
    // Pasted iframes from unknown sites are dropped.
    return [{ tag: 'iframe[src]', getAttrs: (el) => (embedSrcFrom(el) ? null : false) }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const { src, provider, url, ...rest } = HTMLAttributes
    return [
      'iframe',
      mergeAttributes(rest, {
        src: isAllowedEmbedSrc(src) ? src : 'about:blank',
        'data-provider': provider || node.attrs.provider,
        'data-url': url || node.attrs.url,
        allowfullscreen: 'true',
        frameborder: '0',
      }),
    ]
  },

  addCommands() {
    return {
      setEmbed: (attrs) => ({ commands }) => commands.insertContent({ type: this.name, attrs }),
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedView)
  },
})
