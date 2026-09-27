import {
  Code2, Flame, Heading1, Heading2, Heading3, ImageIcon, Info, Lightbulb, List, ListChecks, ListOrdered,
  Minus, MonitorPlay, Pilcrow, Quote, Table, TriangleAlert, Video,
} from 'lucide-react'
import { getLastCodeLanguage } from './lowlight'

const block = (fn) => ({ editor, range }) => fn(editor.chain().focus().deleteRange(range)).run()

const media = (kind) => ({ editor, range, onOpenMedia }) => {
  editor.chain().focus().deleteRange(range).run()
  onOpenMedia?.(kind)
}

export const SLASH_ITEMS = [
  { group: 'Basic', title: 'Text', description: 'Plain paragraph', icon: Pilcrow, keywords: ['paragraph', 'plain'], run: block((c) => c.setParagraph()) },
  { group: 'Basic', title: 'Heading 1', description: 'Large section title', icon: Heading1, keywords: ['h1', 'title'], run: block((c) => c.setNode('heading', { level: 1 })) },
  { group: 'Basic', title: 'Heading 2', description: 'Medium section title', icon: Heading2, keywords: ['h2', 'subtitle'], run: block((c) => c.setNode('heading', { level: 2 })) },
  { group: 'Basic', title: 'Heading 3', description: 'Small section title', icon: Heading3, keywords: ['h3'], run: block((c) => c.setNode('heading', { level: 3 })) },
  { group: 'Lists', title: 'Bulleted list', description: 'Simple bullet points', icon: List, keywords: ['ul', 'bullet', 'unordered'], run: block((c) => c.toggleBulletList()) },
  { group: 'Lists', title: 'Numbered list', description: 'Steps in order', icon: ListOrdered, keywords: ['ol', 'ordered', 'steps'], run: block((c) => c.toggleOrderedList()) },
  { group: 'Lists', title: 'Checklist', description: 'Track problems to revise', icon: ListChecks, keywords: ['todo', 'task', 'checkbox'], run: block((c) => c.toggleTaskList()) },
  { group: 'Blocks', title: 'Code block', description: 'Syntax-highlighted code', icon: Code2, keywords: ['code', 'snippet', 'cpp', 'java', 'python'], run: block((c) => c.setCodeBlock({ language: getLastCodeLanguage() })) },
  { group: 'Blocks', title: 'Quote', description: 'Highlight a quote', icon: Quote, keywords: ['blockquote'], run: block((c) => c.toggleBlockquote()) },
  { group: 'Blocks', title: 'Table', description: 'Compare approaches & complexity', icon: Table, keywords: ['grid', 'complexity', 'compare'], run: block((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true })) },
  { group: 'Blocks', title: 'Divider', description: 'Separate sections', icon: Minus, keywords: ['hr', 'line', 'separator'], run: block((c) => c.setHorizontalRule()) },
  { group: 'Callouts', title: 'Note', description: 'Blue info box', icon: Info, keywords: ['callout', 'info'], run: block((c) => c.setCallout({ variant: 'note' })) },
  { group: 'Callouts', title: 'Tip', description: 'Green tip box', icon: Lightbulb, keywords: ['callout', 'hint', 'trick'], run: block((c) => c.setCallout({ variant: 'tip' })) },
  { group: 'Callouts', title: 'Warning', description: 'Amber caution box', icon: TriangleAlert, keywords: ['callout', 'caution', 'pitfall'], run: block((c) => c.setCallout({ variant: 'warning' })) },
  { group: 'Callouts', title: 'Important', description: 'Red must-remember box', icon: Flame, keywords: ['callout', 'danger', 'remember'], run: block((c) => c.setCallout({ variant: 'important' })) },
  { group: 'Media', title: 'Photo', description: 'Upload, paste or link an image', icon: ImageIcon, keywords: ['image', 'picture', 'img', 'screenshot'], run: media('image') },
  { group: 'Media', title: 'Video', description: 'Upload an MP4, WebM or MOV', icon: Video, keywords: ['mp4', 'movie', 'clip'], run: media('video') },
  { group: 'Media', title: 'YouTube / embed', description: 'YouTube, Vimeo, Loom or Drive link', icon: MonitorPlay, keywords: ['youtube', 'vimeo', 'loom', 'embed', 'drive'], run: media('embed') },
]

export function filterSlashItems(query) {
  const q = query.trim().toLowerCase()
  if (!q) return SLASH_ITEMS
  return SLASH_ITEMS.filter(
    (item) => item.title.toLowerCase().includes(q) || item.keywords.some((keyword) => keyword.startsWith(q)),
  )
}
