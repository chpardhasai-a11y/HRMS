'use client';

import './globals.css';

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body>
        <main className="error-page">
          <section className="error-card">
            <p className="eyebrow">Application Error</p>
            <h1>We could not load this screen</h1>
            <p>{error?.message || 'Please retry after the app refreshes.'}</p>
            <button className="btn btn-primary" type="button" onClick={reset}>
              Reload Screen
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
