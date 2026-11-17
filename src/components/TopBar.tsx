import { Bell, LogOut, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './TopBar.css'

interface TopBarProps {
  pendingRequests: number
  onOpenRequests: () => void
}

export default function TopBar({ pendingRequests, onOpenRequests }: TopBarProps) {
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
          <button
            type="button"
            className="topbar-bell"
            onClick={onOpenRequests}
            aria-label={`Demandes de formulation en attente : ${pendingRequests}`}
            title={pendingRequests > 0 ? `${pendingRequests} demande(s) de formulation en attente` : 'Aucune demande en attente'}
          >
            <Bell size={17} />
            {pendingRequests > 0 && <span className="topbar-bell-count">{pendingRequests > 9 ? '9+' : pendingRequests}</span>}
          </button>
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
