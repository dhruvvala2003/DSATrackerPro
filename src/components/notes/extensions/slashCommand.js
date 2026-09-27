import { Extension } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { exitSuggestion } from '@tiptap/suggestion'
import SlashMenu from '../SlashMenu'
import { filterSlashItems } from '../slashItems'

const slashPluginKey = new PluginKey('slashCommand')

// Type "/" to insert headings, lists, code, tables, callouts, photos and videos.
export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return { onOpenMedia: null }
  },

  addProseMirrorPlugins() {
    const { onOpenMedia } = this.options

    return [
      Suggestion({
        editor: this.editor,
        pluginKey: slashPluginKey,
        char: '/',
        placement: 'bottom-start',
        allow: ({ state, range }) => !state.doc.resolve(range.from).parent.type.spec.code,
        items: ({ query }) => filterSlashItems(query),
        command: ({ editor, range, props }) => props.run({ editor, range, onOpenMedia }),
        render: () => {
          let component = null
          let unmount = null
          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashMenu, { props, editor: props.editor })
              component.element.style.zIndex = '60'
              unmount = props.mount(component.element)
            },
            onUpdate: (props) => component?.updateProps(props),
            onKeyDown: ({ event, view }) => {
              if (event.key === 'Escape') {
                exitSuggestion(view, slashPluginKey)
                return true
              }
              return component?.ref?.onKeyDown({ event }) ?? false
            },
            onExit: () => {
              unmount?.()
              component?.destroy()
              component = null
              unmount = null
            },
          }
        },
      }),
    ]
  },
})
