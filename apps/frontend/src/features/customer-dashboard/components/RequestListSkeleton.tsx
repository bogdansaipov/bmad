export function RequestListSkeleton() {
  return (
    <div
      className="skeleton-list"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading requests"
    >
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-line skeleton-line--title" />
          <div className="skeleton-line skeleton-line--meta" />
        </div>
      ))}
    </div>
  );
}
