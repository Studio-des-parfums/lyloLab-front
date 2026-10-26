import {
  LayoutDashboard,
  FlaskConical,
  Leaf,
  Sparkles,
  ShieldCheck,
  TestTube2,
  BookOpen,
  FileText,
  Users,
  UserCog,
} from 'lucide-react'
import { navItems } from '../data/mockFormula'
import './Sidebar.css'

const icons: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard size={18} />,
  formulation: <FlaskConical size={18} />,
  clients: <Users size={18} />,
  materials: <Leaf size={18} />,
  accords: <Sparkles size={18} />,
  regulation: <ShieldCheck size={18} />,
  tests: <TestTube2 size={18} />,
  library: <BookOpen size={18} />,
  export: <FileText size={18} />,
  team: <UserCog size={18} />,
}

interface SidebarProps {
  active: string
  onSelect: (key: string) => void
}

export default function Sidebar({ active, onSelect }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-title">Lylo-Lab</span>
        <span className="sidebar-brand-sub">PARIS</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.key}
            className={`sidebar-item ${active === item.key ? 'active' : ''}`}
            onClick={() => onSelect(item.key)}
            type="button"
          >
            {icons[item.key]}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p className="sidebar-footer-line">L'ART</p>
        <p className="sidebar-footer-line">LA SCIENCE</p>
        <p className="sidebar-footer-line">L'ÉMOTION</p>
      </div>
    </aside>
  )
}
