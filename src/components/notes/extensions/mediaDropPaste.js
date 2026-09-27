import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { mediaKind, parseEmbedUrl } from '../../../lib/mediaUpload'

/**
 * Paste or drop photos/videos straight into the page, and turn a YouTube/Vimeo/Loom link
 * pasted on an empty line into an embedded player.
 */
export const MediaDropPaste = Extension.create({
  name: 'mediaDropPaste',

  addOptions() {
    return { onFiles: null }
  },

  addProseMirrorPlugins() {
    const { editor } = this
    const { onFiles } = this.options

    return [
      new Plugin({
        key: new PluginKey('mediaDropPaste'),
        props: {
          handlePaste(view, event) {
            const files = Array.from(event.clipboardData?.files || [])
            if (onFiles && files.some((file) => mediaKind(file))) {
              event.preventDefault()
              onFiles(editor, files.filter((file) => mediaKind(file)), view.state.selection.from)
              return true
            }

            const text = event.clipboardData?.getData('text/plain')?.trim()
            const { $from, empty } = view.state.selection
            const onEmptyLine = empty && $from.parent.isTextblock && $from.parent.content.size === 0 && !$from.parent.type.spec.code
            if (text && onEmptyLine && !/\s/.test(text)) {
              const embed = parseEmbedUrl(text)
              if (embed) {
                event.preventDefault()
                editor.chain().focus().setEmbed({ src: embed.src, provider: embed.provider, url: embed.url }).run()
                return true
              }
            }
            return false
          },

          handleDrop(view, event, _slice, moved) {
            if (moved || !onFiles) return false
            const files = Array.from(event.dataTransfer?.files || [])
            if (!files.length) return false
            event.preventDefault()
            const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
            onFiles(editor, files, pos ?? view.state.selection.from)
            return true
          },
        },
      }),
    ]
  },
})
