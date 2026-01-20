import './App.css'
import Canvas from "./Canvas.tsx"

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
          agent_aside
        </aside>
      </main>
    </div>
  )
}

export default App
