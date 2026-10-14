import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Loading from '../common/Loading'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin, recoveryMode } = useAuth()
  const location = useLocation()

  if (loading) {
    return <Loading />
  }

  if (recoveryMode) {
    return <Navigate to="/reset-password" replace />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
