import { Search, BookOpen, FileStack, FolderKanban } from 'lucide-react'
import './TopBar.css'

interface TopBarProps {
  onOpenMyFormulas: () => void
  myFormulasActive?: boolean
}

export default function TopBar({ onOpenMyFormulas, myFormulasActive }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-search">
        <span className="topbar-search-label">Créer des émotions en parfum</span>
        <div className="topbar-search-box">
          <Search size={16} />
          <input type="text" placeholder="Rechercher une matière première..." />
        </div>
      </div>

      <div className="topbar-actions">
        <button type="button" className="topbar-action">
          <BookOpen size={18} />
          <span>Bibliothèque</span>
        </button>
        <button
          type="button"
          className={`topbar-action ${myFormulasActive ? 'topbar-action-active' : ''}`}
          onClick={onOpenMyFormulas}
        >
          <FileStack size={18} />
          <span>Mes formules</span>
        </button>
        <button type="button" className="topbar-action">
          <FolderKanban size={18} />
          <span>Projets</span>
        </button>
      </div>
    </header>
  )
}
