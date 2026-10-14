import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth, ADMIN_EMAIL } from '../../context/AuthContext'
import Loading from '../common/Loading'
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Database,
  ArrowRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function UserManagementPage() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'pending' | 'approved' | 'blocked' | 'rejected'
  const [updatingId, setUpdatingId] = useState(null)
  const [notification, setNotification] = useState(null)
  const [transferring, setTransferring] = useState(false)

  useEffect(() => {
    if (!isAdmin) {
      navigate('/', { replace: true })
      return
    }
    loadRecords()
  }, [isAdmin, navigate])

  const loadRecords = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const { data, error } = await supabase
        .from('user_approvals')
        .select('*')
        .order('requested_at', { ascending: false })

      if (error) {
        console.error('Error fetching user approvals:', error)
        setNotification({
          type: 'error',
          text: error.message || 'Failed to load user records. Make sure the user_approvals table exists.',
        })
      } else {
        setRecords(data || [])
      }
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleUpdateStatus = async (userId, targetEmail, newStatus) => {
    if (targetEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      alert('The master administrator account cannot be deactivated or blocked.')
      return
    }

    const actionName =
      newStatus === 'approved' ? 'approve' :
      newStatus === 'blocked' ? 'block' :
      newStatus === 'rejected' ? 'reject' : 'update'

    if (newStatus === 'blocked' || newStatus === 'rejected') {
      const confirmAction = window.confirm(
        `Are you sure you want to ${actionName} "${targetEmail}"? They will lose access to the platform immediately.`
      )
      if (!confirmAction) return
    }

    setUpdatingId(userId)
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('user_approvals')
        .update({
          status: newStatus,
          updated_at: now,
        })
        .eq('user_id', userId)

      if (error) throw error

      setRecords((prev) =>
        prev.map((r) =>
          r.user_id === userId
            ? { ...r, status: newStatus, updated_at: now }
            : r
        )
      )

      setNotification({
        type: 'success',
        text: `User ${targetEmail} status changed to "${newStatus}".`,
      })
    } catch (err) {
      console.error('Update status failed:', err)
      setNotification({
        type: 'error',
        text: err?.message || 'Failed to update user status.',
      })
    } finally {
      setUpdatingId(null)
    }
  }

  // Helper to migrate legacy notes to current master user account
  const handleTransferLegacyData = async () => {
    if (!user) return
    const confirmTransfer = window.confirm(
      `Transfer all current notes & subjects that do not have an owner to your master account (${ADMIN_EMAIL})?`
    )
    if (!confirmTransfer) return

    setTransferring(true)
    try {
      // 1. Update notes_subjects where user_id is null
      const { data: subData, error: subError } = await supabase
        .from('notes_subjects')
        .update({ user_id: user.id })
        .is('user_id', null)
        .select('id')

      if (subError && !subError.message?.includes('column "user_id" of relation')) {
        throw subError
      }

      // 2. Update notes_pages where user_id is null
      const { data: pageData, error: pageError } = await supabase
        .from('notes_pages')
        .update({ user_id: user.id })
        .is('user_id', null)
        .select('id')

      if (pageError && !pageError.message?.includes('column "user_id" of relation')) {
        throw pageError
      }

      setNotification({
        type: 'success',
        text: `Migration complete! Existing subjects (${subData?.length || 0}) and notes (${pageData?.length || 0}) are now linked to your master account.`,
      })
    } catch (err) {
      console.error('Data transfer error:', err)
      setNotification({
        type: 'error',
        text: err?.message || 'Failed to transfer data. Please run the SQL migration script first.',
      })
    } finally {
      setTransferring(false)
    }
  }

  const counts = useMemo(() => {
    return {
      all: records.length,
      pending: records.filter((r) => r.status === 'pending').length,
      approved: records.filter((r) => r.status === 'approved').length,
      blocked: records.filter((r) => r.status === 'blocked' || r.status === 'inactive').length,
      rejected: records.filter((r) => r.status === 'rejected').length,
    }
  }, [records])

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        !search.trim() || r.email?.toLowerCase().includes(search.toLowerCase().trim())

      if (!matchesSearch) return false

      if (activeTab === 'all') return true
      if (activeTab === 'pending') return r.status === 'pending'
      if (activeTab === 'approved') return r.status === 'approved'
      if (activeTab === 'blocked') return r.status === 'blocked' || r.status === 'inactive'
      if (activeTab === 'rejected') return r.status === 'rejected'
      return true
    })
  }, [records, search, activeTab])

  if (loading) return <Loading />

  return (
    <div className="w-full max-w-6xl mx-auto pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 shadow-sm mb-4">
            <Shield size={14} className="text-indigo-600" />
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
              Master Admin Control Center
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            User Approvals & Access
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Review signup requests, approve new learners, and manage block/unblock permissions for the platform.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTransferLegacyData}
            disabled={transferring}
            title="Link all current website notes to your master account"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all border border-slate-300 shadow-sm"
          >
            <Database size={14} />
            {transferring ? 'Transferring...' : 'Transfer Legacy Data to Master'}
          </button>

          <button
            onClick={() => loadRecords(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-sm"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-6 p-4 rounded-2xl border text-xs font-medium flex items-center justify-between ${
              notification.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'error' ? (
                <AlertTriangle size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
              <span>{notification.text}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-600 font-bold ml-4"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <div className="text-3xl font-extrabold text-amber-500">{counts.pending}</div>
          <p className="text-[11px] text-slate-400 mt-1">Awaiting approval</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Approved
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-600">{counts.approved}</div>
          <p className="text-[11px] text-slate-400 mt-1">Active users</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Blocked
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          </div>
          <div className="text-3xl font-extrabold text-rose-500">{counts.blocked}</div>
          <p className="text-[11px] text-slate-400 mt-1">Access restricted</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Users
            </span>
            <Users size={14} className="text-slate-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{counts.all}</div>
          <p className="text-[11px] text-slate-400 mt-1">All accounts</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        {/* Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto">
          {[
            { id: 'all', label: `All (${counts.all})` },
            { id: 'pending', label: `Pending (${counts.pending})` },
            { id: 'approved', label: `Approved (${counts.approved})` },
            { id: 'blocked', label: `Blocked (${counts.blocked})` },
            { id: 'rejected', label: `Rejected (${counts.rejected})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email..."
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Records Table / List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Users size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No users found</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              {search
                ? `No accounts match "${search}". Try clearing your search.`
                : `There are currently no users in the "${activeTab}" filter tab.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRecords.map((r) => {
              const isBusy = updatingId === r.user_id
              const isMaster = r.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
              const requestedDate = r.requested_at
                ? new Date(r.requested_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '-'
              const updatedDate = r.updated_at
                ? new Date(r.updated_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '-'

              return (
                <div
                  key={r.id || r.user_id}
                  className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  {/* User info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm shrink-0">
                      {r.email?.[0]?.toUpperCase() || 'U'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-900 truncate">
                          {r.email}
                        </span>
                        {isMaster && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                            Master Admin
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> Requested: {requestedDate}
                        </span>
                        <span>•</span>
                        <span>Updated: {updatedDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    {/* Status badge */}
                    <div>
                      {r.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock size={12} /> Pending
                        </span>
                      )}
                      {r.status === 'approved' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <UserCheck size={12} /> Approved
                        </span>
                      )}
                      {(r.status === 'blocked' || r.status === 'inactive') && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <ShieldAlert size={12} /> Blocked
                        </span>
                      )}
                      {r.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
                          <UserX size={12} /> Rejected
                        </span>
                      )}
                    </div>

                    {/* Action buttons (only for non-master accounts) */}
                    {!isMaster && (
                      <div className="flex items-center gap-2">
                        {r.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(r.user_id, r.email, 'approved')}
                              disabled={isBusy}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-1 disabled:opacity-50"
                            >
                              <UserCheck size={13} /> Approve
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(r.user_id, r.email, 'rejected')}
                              disabled={isBusy}
                              className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1 disabled:opacity-50"
                            >
                              <UserX size={13} /> Reject
                            </button>
                          </>
                        )}

                        {r.status === 'approved' && (
                          <button
                            onClick={() => handleUpdateStatus(r.user_id, r.email, 'blocked')}
                            disabled={isBusy}
                            className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all flex items-center gap-1 disabled:opacity-50"
                          >
                            <ShieldAlert size={13} /> Block
                          </button>
                        )}

                        {(r.status === 'blocked' || r.status === 'inactive' || r.status === 'rejected') && (
                          <button
                            onClick={() => handleUpdateStatus(r.user_id, r.email, 'approved')}
                            disabled={isBusy}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-1 disabled:opacity-50"
                          >
                            <UserCheck size={13} /> Unblock / Approve
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
