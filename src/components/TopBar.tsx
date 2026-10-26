import { LogOut, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './TopBar.css'

export default function TopBar() {
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
