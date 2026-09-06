'use client';

export default function Error({ error, reset }) {
  return (
    <main className="error-page">
      <section className="error-card">
        <p className="eyebrow">Application Error</p>
        <h1>Something went wrong</h1>
        <p>{error?.message || 'The page could not be rendered.'}</p>
        <button className="btn btn-primary" type="button" onClick={reset}>
          Try Again
        </button>
      </section>
    </main>
  );
}
