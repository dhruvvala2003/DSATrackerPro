import { createLowlight } from 'lowlight'
import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import css from 'highlight.js/lib/languages/css'
import go from 'highlight.js/lib/languages/go'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import kotlin from 'highlight.js/lib/languages/kotlin'
import php from 'highlight.js/lib/languages/php'
import plaintext from 'highlight.js/lib/languages/plaintext'
import python from 'highlight.js/lib/languages/python'
import ruby from 'highlight.js/lib/languages/ruby'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import swift from 'highlight.js/lib/languages/swift'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'

export const lowlight = createLowlight({
  bash, c, cpp, csharp, css, go, java, javascript, json, kotlin, php, plaintext, python, ruby, rust, sql, swift, typescript, xml,
})

// '' means "detect automatically".
export const CODE_LANGUAGES = [
  { value: '', label: 'Auto-detect' },
  { value: 'plaintext', label: 'Plain text' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'c', label: 'C' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'swift', label: 'Swift' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'HTML / XML' },
  { value: 'css', label: 'CSS' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
]

export function languageLabel(value) {
  return CODE_LANGUAGES.find((lang) => lang.value === value)?.label || value || 'Code'
}

const LAST_LANGUAGE_KEY = 'dsa-notes:last-code-language'

export function getLastCodeLanguage() {
  try {
    return localStorage.getItem(LAST_LANGUAGE_KEY) || null
  } catch {
    return null
  }
}

export function setLastCodeLanguage(value) {
  try {
    if (value) localStorage.setItem(LAST_LANGUAGE_KEY, value)
  } catch {
    // ignore
  }
}
