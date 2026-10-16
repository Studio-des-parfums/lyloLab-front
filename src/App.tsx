import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [apiStatus, setApiStatus] = useState<string>('...')

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api`)
      .then((res) => res.text())
      .then(setApiStatus)
      .catch(() => setApiStatus('API non disponible'))
  }, [])

  return (
    <div className="app">
      <h1>Lylo Lab</h1>
      <p>Statut API : {apiStatus}</p>
    </div>
  )
}

export default App
