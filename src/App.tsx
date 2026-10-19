import { useState } from 'react'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import DashboardPlaceholder from './pages/DashboardPlaceholder'
import MaterialsLibrary from './pages/MaterialsLibrary'
import FormulationIntro from './pages/FormulationIntro'
import FormulaBuilder from './pages/FormulaBuilder'
import { FormulaProvider } from './context/FormulaContext'
import './App.css'

function App() {
  const [active, setActive] = useState('dashboard')
  const [formulationStarted, setFormulationStarted] = useState(false)

  function handleSelect(key: string) {
    if (key !== 'formulation') setFormulationStarted(false)
    setActive(key)
  }

  function renderContent() {
    switch (active) {
      case 'materials':
        return <MaterialsLibrary />
      case 'formulation':
        return formulationStarted ? (
          <FormulaBuilder />
        ) : (
          <FormulationIntro onStart={() => setFormulationStarted(true)} />
        )
      default:
        return <DashboardPlaceholder />
    }
  }

  return (
    <FormulaProvider>
      <div className="app-layout">
        <Sidebar active={active} onSelect={handleSelect} />
        <div className="app-main">
          <TopBar />
          {renderContent()}
        </div>
      </div>
    </FormulaProvider>
  )
}

export default App
