import { Extension } from '@tiptap/core'

export const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => (element.style?.fontSize ? element.style.fontSize.replace(/['"]+/g, '') : null),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {}
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        if (!fontSize) {
          return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle()
        }
        const sizeWithUnit = typeof fontSize === 'number' || /^\d+$/.test(String(fontSize).trim())
          ? `${String(fontSize).trim()}px`
          : String(fontSize).trim()
        return chain()
          .setMark('textStyle', { fontSize: sizeWithUnit })
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
      },
    }
  },
})
