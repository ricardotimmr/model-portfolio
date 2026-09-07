import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="main-content" className="not-found">
      <p className="eyebrow">404</p>
      <h1>Series not found.</h1>
      <Link href="/">Return to index</Link>
    </main>
  );
}
