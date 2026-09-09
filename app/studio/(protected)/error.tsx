'use client';

export default function StudioError({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="studio-dashboard studio-route-state">
      <p className="studio-kicker">Studio error</p>
      <h1>Content could not be loaded.</h1>
      <p>The database or Studio session may be temporarily unavailable.</p>
      <button className="studio-primary-button" type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
