import { Link, Logo } from './ui'

export default function Privacy() {
  return (
    <div className="page privacy">
      <header className="join-top"><Logo /><Link to="/" className="back-link">← Back to home</Link></header>
      <main className="privacy-body">
        <h1 className="h2">Privacy</h1>
        <p className="body">When you join the waitlist, we store your email address, signup date, and confirmation status in our private Cloudflare database. Brevo processes your email address to send your signup confirmation. We will also email your invitation when it is ready. We do not sell your email or use it for advertising. You can reply to your confirmation to request removal.</p>
        <p className="body">GitHub hosts this website and Cloudflare processes signup requests. They may process technical information, such as your IP address, to operate and protect their services. Our waitlist database does not store your IP address, and this site uses no advertising trackers.</p>
        <p className="body">When the app launches, this page will explain exactly what the glove and the app store, where, and how to delete it.</p>
      </main>
    </div>
  )
}
