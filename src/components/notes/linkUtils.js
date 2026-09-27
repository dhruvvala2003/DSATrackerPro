export function normalizeUrl(value) {
  const url = value.trim()
  if (!url) return ''
  return /^(https?:|mailto:|tel:|#|\/)/i.test(url) ? url : `https://${url}`
}

/** Applies a link to the selection, or inserts the URL as linked text when nothing is selected. */
export function applyLink(editor, rawHref) {
  const url = normalizeUrl(rawHref)
  const chain = editor.chain().focus()
  if (!url) return chain.extendMarkRange('link').unsetLink().run()
  if (editor.state.selection.empty && !editor.isActive('link')) {
    return chain.insertContent({ type: 'text', text: rawHref.trim(), marks: [{ type: 'link', attrs: { href: url } }] }).run()
  }
  return chain.extendMarkRange('link').setLink({ href: url }).run()
}
