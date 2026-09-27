import { Node, mergeAttributes } from '@tiptap/core'

export const CALLOUT_VARIANTS = [
  { value: 'note', label: 'Note' },
  { value: 'tip', label: 'Tip' },
  { value: 'warning', label: 'Warning' },
  { value: 'important', label: 'Important' },
]

const VARIANT_VALUES = CALLOUT_VARIANTS.map((v) => v.value)

// A highlighted box for key takeaways ("Tip: use two pointers…"). Its icon is drawn in CSS.
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: 'note',
        parseHTML: (el) => (VARIANT_VALUES.includes(el.getAttribute('data-variant')) ? el.getAttribute('data-variant') : 'note'),
        renderHTML: (attrs) => ({ 'data-variant': attrs.variant }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-callout': '', class: 'note-callout' }, HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setCallout:
        (attrs = {}) =>
        ({ editor, commands }) =>
          editor.isActive(this.name) ? commands.updateAttributes(this.name, attrs) : commands.wrapIn(this.name, attrs),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    }
  },
})
