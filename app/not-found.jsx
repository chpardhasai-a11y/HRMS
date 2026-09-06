export default function NotFound() {
  return (
    <main className="error-page">
      <section className="error-card">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p>The requested HRMS screen does not exist.</p>
        <a className="btn btn-primary" href="/admin">
          Go To Admin
        </a>
      </section>
    </main>
  );
}
