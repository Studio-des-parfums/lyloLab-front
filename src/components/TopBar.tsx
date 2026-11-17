import { LogOut, Search } from 'lucide-react'
import NotificationBell from './NotificationBell'
import { useAuth } from '../context/AuthContext'
import './TopBar.css'

interface TopBarProps {
  pendingRequests: number
  onOpenRequests: () => void
  onOpenFormula: (formulaId: string, projectId: string | null) => void
}

export default function TopBar({ pendingRequests, onOpenRequests, onOpenFormula }: TopBarProps) {
  const { user, logout } = useAuth()

  return (
    <header className="topbar">
      <div className="topbar-search">
        <span className="topbar-search-label">Créer des émotions en parfum</span>
        <div className="topbar-search-box">
          <Search size={16} />
          <input type="text" placeholder="Rechercher une matière première..." />
        </div>
      </div>
      {user && (
        <div className="topbar-user">
          <NotificationBell
            pendingRequests={pendingRequests}
            onOpenRequests={onOpenRequests}
            onOpenFormula={onOpenFormula}
          />
          <span className="topbar-user-text">
            <span className="topbar-user-name">{user.name}</span>
            <span className="topbar-user-team">{user.team.name}</span>
          </span>
          <button
            type="button"
            className="topbar-logout"
            onClick={logout}
            aria-label="Se déconnecter"
            title="Se déconnecter"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </header>
  )
}
