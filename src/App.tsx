import { useState } from 'react'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import DashboardPlaceholder from './pages/DashboardPlaceholder'
import MaterialsLibrary from './pages/MaterialsLibrary'
import FormulationIntro from './pages/FormulationIntro'
import FormulaBuilder from './pages/FormulaBuilder'
import ProjectsPage from './pages/ProjectsPage'
import { FormulaProvider, useFormula } from './context/FormulaContext'
import './App.css'

function AppContent() {
  const [active, setActive] = useState('dashboard')
  const [formulationStarted, setFormulationStarted] = useState(false)
  const [showMyFormulas, setShowMyFormulas] = useState(false)
  const [builderOrigin, setBuilderOrigin] = useState<'intro' | 'myFormulas'>('intro')
  const { loadFormula } = useFormula()

  function handleSelect(key: string) {
    if (key !== 'formulation') setFormulationStarted(false)
    setShowMyFormulas(false)
    setActive(key)
  }

  function handleCreateNewFromMyFormulas() {
    setShowMyFormulas(false)
    setActive('formulation')
    setBuilderOrigin('myFormulas')
    setFormulationStarted(true)
  }

  async function handleViewFormula(id: string) {
    await loadFormula(id)
    setShowMyFormulas(false)
    setActive('formulation')
    setBuilderOrigin('myFormulas')
    setFormulationStarted(true)
  }

  function handleBackFromBuilder() {
    setFormulationStarted(false)
    if (builderOrigin === 'myFormulas') {
      setShowMyFormulas(true)
    }
  }

  function renderContent() {
    if (showMyFormulas) {
      return (
        <ProjectsPage
          onCreateNew={handleCreateNewFromMyFormulas}
          onViewFormula={handleViewFormula}
        />
      )
    }

    switch (active) {
      case 'materials':
        return <MaterialsLibrary />
      case 'formulation':
        return formulationStarted ? (
          <FormulaBuilder onBack={handleBackFromBuilder} />
        ) : (
          <FormulationIntro
            onStart={() => {
              setBuilderOrigin('intro')
              setFormulationStarted(true)
            }}
          />
        )
      default:
        return <DashboardPlaceholder />
    }
  }

  return (
    <div className="app-layout">
      <Sidebar active={active} onSelect={handleSelect} />
      <div className="app-main">
        <TopBar
          onOpenMyFormulas={() => setShowMyFormulas(true)}
          myFormulasActive={showMyFormulas}
        />
        {renderContent()}
      </div>
    </div>
  )
}

function App() {
  return (
    <FormulaProvider>
      <AppContent />
    </FormulaProvider>
  )
}

export default App
