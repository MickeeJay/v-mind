export default function Home() {
  const year = new Date().getFullYear();

  return (
    <>
      <div className="vm-grid-overlay" aria-hidden="true" />

      <main className="vm-wrap">
        <header className="vm-header">
          <div className="vm-nav vm-fade vm-d1">
            <div className="vm-brand" aria-label="V-Mind brand">
              <span className="vm-brand-mark" aria-hidden="true" />
              <span>V-Mind</span>
            </div>

            <nav className="vm-nav-links" aria-label="Primary">
              <a href="#modules">Modules</a>
              <a href="#roadmap">Roadmap</a>
              <a href="https://github.com/MickeeJay/v-mind" target="_blank" rel="noreferrer">
                GitHub
              </a>
            </nav>
          </div>
        </header>

        <section className="vm-hero">
          <p className="vm-eyebrow vm-fade vm-d1">Frontend Skeleton Ready</p>

          <h1 className="vm-title vm-fade vm-d2">Build DeFi Strategy UX on a Solid App Shell</h1>

          <p className="vm-lead vm-fade vm-d3">
            This is the starting frontend skeleton for V-Mind. It is intentionally structured for staged feature
            growth: wallet onboarding, vault lifecycle flows, strategy browsing, and protocol analytics.
          </p>

          <div className="vm-cta-row vm-fade vm-d4">
            <a className="vm-btn vm-btn-primary" href="#modules">
              Continue Development
            </a>
            <a className="vm-btn vm-btn-secondary" href="#roadmap">
              View Build Stages
            </a>
          </div>

          <div className="vm-stats vm-fade vm-d4" aria-label="Frontend focus pillars">
            <article className="vm-stat-card">
              <strong>App Shell</strong>
              <span>Navigation and layout scaffolded for future route expansion.</span>
            </article>
            <article className="vm-stat-card">
              <strong>Composable UI</strong>
              <span>Sectioned structure ready for feature modules and shared components.</span>
            </article>
            <article className="vm-stat-card">
              <strong>Deployment Ready</strong>
              <span>Runs from the web app root and deploys cleanly on Vercel.</span>
            </article>
          </div>
        </section>

        <section id="modules" className="vm-section">
          <h2 className="vm-section-title">Frontend Modules to Implement</h2>
          <div className="vm-card-grid">
            <article className="vm-card vm-fade vm-d1">
              <h3>Wallet and Session</h3>
              <p>Connect wallet, resolve account context, and provide guarded entry points for actions.</p>
            </article>

            <article className="vm-card vm-fade vm-d2">
              <h3>Vault Dashboard</h3>
              <p>List vaults, show state, balances, and execution status with owner-scoped interactions.</p>
            </article>

            <article className="vm-card vm-fade vm-d3">
              <h3>Strategy Explorer</h3>
              <p>Browse strategy registry metadata by type, risk tier, and protocol target.</p>
            </article>
          </div>
        </section>

        <section id="roadmap" className="vm-section">
          <h2 className="vm-section-title">Suggested Build Stages</h2>
          <ol className="vm-roadmap">
            <li>Wire wallet provider and account-aware app state.</li>
            <li>Add read-only protocol and strategy registry views.</li>
            <li>Implement vault create/deposit/withdraw UI flows.</li>
            <li>Add admin and emergency controls with role-aware UX.</li>
          </ol>
        </section>

        <footer className="vm-footer">
          <span>{year}</span> V-Mind frontend skeleton. Continue from here as the main web app.
        </footer>
      </main>
    </>
  );
}
