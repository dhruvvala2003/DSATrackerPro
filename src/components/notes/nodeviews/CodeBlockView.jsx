import { useState } from 'react'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import { Check, Copy } from 'lucide-react'
import { CODE_LANGUAGES, languageLabel, setLastCodeLanguage } from '../lowlight'
import { toast } from '../../../lib/toast'

export default function CodeBlockView({ node, editor, updateAttributes }) {
  const [copied, setCopied] = useState(false)
  const language = node.attrs.language || ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(node.textContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error('Couldn’t copy to the clipboard')
    }
  }

  return (
    <NodeViewWrapper className="note-code">
      <div className="note-code__bar" contentEditable={false}>
        <span className="note-code__dots" aria-hidden="true"><i /><i /><i /></span>
        {editor.isEditable ? (
          <select
            className="note-code__lang"
            value={language}
            aria-label="Code language"
            onChange={(event) => {
              updateAttributes({ language: event.target.value || null })
              setLastCodeLanguage(event.target.value)
            }}
          >
            {CODE_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>{lang.label}</option>
            ))}
          </select>
        ) : (
          <span className="note-code__lang">{languageLabel(language)}</span>
        )}
        <button type="button" className="note-code__copy" onMouseDown={(event) => event.preventDefault()} onClick={copy}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre spellCheck={false}>
        <NodeViewContent as="code" className={language ? `hljs language-${language}` : 'hljs'} style={{ whiteSpace: 'pre' }} />
      </pre>
    </NodeViewWrapper>
  )
}
