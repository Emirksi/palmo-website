import { Link, Logo } from './ui'

export default function Privacy() {
  return (
    <div className="page privacy">
      <header className="join-top"><Logo /><Link to="/" className="back-link">← Back to home</Link></header>
      <main className="privacy-body">
        <h1 className="h2">Privacy</h1>
        <p className="body">This site sets no cookies and runs no trackers. In this preview, the waitlist form keeps your email only in your own browser. Nothing is sent to us yet.</p>
        <p className="body">When the app launches, this page will explain exactly what the glove and the app store, where, and how to delete it.</p>
      </main>
    </div>
  )
}
