import './App.css'
import ArchyAgent from './components/ArchyAgent.tsx'
import Canvas from "./components/Canvas.tsx"
import SubscriptionSelect from "./components/SubscriptionSelect.tsx"
import useResizable from "./hooks/useResizable"

function App() {
  const { width: agentWidth, handleMouseDown } = useResizable({
    initialWidth: 400,
    minWidth: 300,
    maxWidth: 800,
    direction: 'right'
  })

  return (
    <div className="container">
      <header className="header">
        <div className="headerTitle">Archy</div>
        <div className="headerActions">
          <SubscriptionSelect />
        </div>
      </header>
      <main className="main">
        <section className="canvas_section" style={{ width: `calc(100% - ${agentWidth}px)` }}>
          <Canvas />
        </section>
        <div
          className="resizer"
          onMouseDown={handleMouseDown}
          title="Drag to resize"
        />
        <aside className="agent_aside" style={{ width: `${agentWidth}px` }}>
          <ArchyAgent />
        </aside>
      </main>
    </div>
  )
}

export default App
