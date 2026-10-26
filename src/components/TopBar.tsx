import { Search } from 'lucide-react'
import './TopBar.css'

export default function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar-search">
        <span className="topbar-search-label">Créer des émotions en parfum</span>
        <div className="topbar-search-box">
          <Search size={16} />
          <input type="text" placeholder="Rechercher une matière première..." />
        </div>
      </div>
    </header>
  )
}
