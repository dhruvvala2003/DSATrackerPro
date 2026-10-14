import { supabase } from './supabaseClient'

// The notes_pages RLS policies reject empty titles, so this is what gets stored until the user names a page.
export const UNTITLED = 'Untitled'

const PAGE_META_COLUMNS = 'id, title, page_order, created_at, updated_at'

// ---------------------------------------------------------------------------
// Pending writes
//
// Saves keep running after the editor unmounts (e.g. the user clicks "Back" right
// after typing). Screens that read notes wait for these first, so they never show
// content that is older than what the user just typed.
// ---------------------------------------------------------------------------
const pendingWrites = new Set()

export function trackWrite(promise) {
  pendingWrites.add(promise)
  promise.then(
    () => pendingWrites.delete(promise),
    () => pendingWrites.delete(promise),
  )
  return promise
}

export async function waitForPendingWrites(timeoutMs = 8000) {
  if (!pendingWrites.size) return
  let timer
  await Promise.race([
    Promise.allSettled([...pendingWrites]),
    new Promise((resolve) => { timer = setTimeout(resolve, timeoutMs) }),
  ])
  clearTimeout(timer)
}

// ---------------------------------------------------------------------------
// Queries & Mutations for Subjects & Subnotes
// ---------------------------------------------------------------------------
export async function fetchSubject(subjectId, signal) {
  let query = supabase.from('notes_subjects').select('*').eq('id', subjectId).maybeSingle()
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function fetchSubnotes(subjectId, signal) {
  let query = supabase
    .from('notes_subnotes')
    .select('*, notes_pages(id)')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: true })
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error

  return (data || []).map((item) => ({
    ...item,
    pageCount: Array.isArray(item.notes_pages) ? item.notes_pages.length : 0,
  }))
}

export async function fetchSubnote(subnoteId, signal) {
  let query = supabase
    .from('notes_subnotes')
    .select('*, notes_subjects(id, name)')
    .eq('id', subnoteId)
    .maybeSingle()
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createSubnote(subjectId, name, description = '') {
  const { data: authData } = await supabase.auth.getUser()
  const payload = {
    subject_id: subjectId,
    name: name.trim(),
    description: description?.trim() || null,
    updated_at: new Date().toISOString(),
  }
  if (authData?.user?.id) {
    payload.user_id = authData.user.id
  }

  let { data, error } = await supabase
    .from('notes_subnotes')
    .insert(payload)
    .select()
    .single()

  if (error && error.message?.includes('column "user_id" of relation')) {
    delete payload.user_id
    const retry = await supabase.from('notes_subnotes').insert(payload).select().single()
    data = retry.data
    error = retry.error
  }

  if (error) throw error
  return data
}

export async function deleteSubnote(subnoteId) {
  const { error } = await supabase.from('notes_subnotes').delete().eq('id', subnoteId)
  if (error) throw error
}

export async function fetchPageList(identifier, { bySubnote = true, withContent = false, signal } = {}) {
  await waitForPendingWrites()
  const column = bySubnote ? 'subnote_id' : 'subject_id'
  let query = supabase
    .from('notes_pages')
    .select(withContent ? `${PAGE_META_COLUMNS}, content` : PAGE_META_COLUMNS)
    .eq(column, identifier)
    .order('page_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function fetchPage(pageId, signal) {
  await waitForPendingWrites()
  let query = supabase.from('notes_pages').select('*').eq('id', pageId).maybeSingle()
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createPage(subnoteId, subjectId) {
  let orderQuery = supabase
    .from('notes_pages')
    .select('page_order')
    .order('page_order', { ascending: false })
    .limit(1)

  if (subnoteId) {
    orderQuery = orderQuery.eq('subnote_id', subnoteId)
  } else if (subjectId) {
    orderQuery = orderQuery.eq('subject_id', subjectId)
  }

  const { data: last, error: orderError } = await orderQuery
  if (orderError) throw orderError

  const { data: authData } = await supabase.auth.getUser()
  const payload = {
    title: UNTITLED,
    content: null,
    page_order: (last?.[0]?.page_order ?? -1) + 1,
    updated_at: new Date().toISOString(),
  }
  if (subnoteId) payload.subnote_id = subnoteId
  if (subjectId) payload.subject_id = subjectId
  if (authData?.user?.id) payload.user_id = authData.user.id

  let { data, error } = await supabase
    .from('notes_pages')
    .insert(payload)
    .select()
    .single()

  if (error && error.message?.includes('column "subnote_id" of relation')) {
    delete payload.subnote_id
    const retry = await supabase.from('notes_pages').insert(payload).select().single()
    data = retry.data
    error = retry.error
  }

  if (error) throw error
  return data
}

export async function savePage(pageId, { title, content }) {
  const { data, error } = await supabase
    .from('notes_pages')
    .update({
      title: title?.trim() || UNTITLED,
      content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pageId)
    .select('id, updated_at')
  if (error) throw error
  if (!data?.length) {
    const missing = new Error('This page no longer exists, so changes can’t be saved.')
    missing.code = 'PAGE_NOT_FOUND'
    throw missing
  }
  return data[0]
}

export async function deletePage(pageId) {
  const { error } = await supabase.from('notes_pages').delete().eq('id', pageId)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Local drafts: a copy of unsaved edits kept in this browser, so a closed tab,
// crash or network outage never loses what was typed.
// ---------------------------------------------------------------------------
const DRAFT_PREFIX = 'dsa-notes:draft:'

export function writeDraft(pageId, draft) {
  try {
    localStorage.setItem(DRAFT_PREFIX + pageId, JSON.stringify({ ...draft, savedAt: Date.now() }))
    return true
  } catch {
    return false // storage full or unavailable (private mode); the server save still runs
  }
}

export function readDraft(pageId) {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + pageId)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearDraft(pageId) {
  try {
    localStorage.removeItem(DRAFT_PREFIX + pageId)
  } catch {
    // ignore
  }
}
