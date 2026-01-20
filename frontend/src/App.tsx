import './App.css'
import ArchyAgent from './components/ArchyAgent.tsx'
import Canvas from "./components/Canvas.tsx"

function App() {

  return (
    <div className="container">
      <header className="header">
        Archy
      </header>
      <main className="main">
        <section className="canvas_section">
          <Canvas />
        </section>
        <aside className="agent_aside">
          <ArchyAgent />
        </aside>
      </main>
    </div>
  )
}

export default App
