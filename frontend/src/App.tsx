import './App.css'
import ArchyAgent from './components/ArchyAgent.tsx'
import Canvas from "./components/Canvas.tsx"
import SubscriptionSelect from "./components/SubscriptionSelect.tsx"
import useAzureAuth from "./hooks/useAzureAuth"

function App() {
  const { isAuthenticated, signIn, signOut } = useAzureAuth()

  return (
    <div className="container">
      <header className="header">
        <div className="headerTitle">Archy</div>
        <div className="headerActions">
          <SubscriptionSelect />
          <button
            type="button"
            className="headerButton"
            onClick={isAuthenticated ? signOut : signIn}
          >
            {isAuthenticated ? "Sign out" : "Sign in"}
          </button>
        </div>
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
