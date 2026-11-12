interface SkeletonRowsProps {
  rows?: number;
  label?: string;
}

export function SkeletonRows({
  rows = 5,
  label = "Loading records",
}: SkeletonRowsProps) {
  return (
    <div
      className="border border-[#E2E0D8] bg-[#FCFBF9]"
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      <div className="flex items-center gap-4 border-b border-[#D3D0C5] bg-[#F0EEE8] px-3 py-2">
        <div className="skeleton-row h-2.5 w-16" />
        <div className="skeleton-row h-2.5 w-28" />
        <div className="skeleton-row h-2.5 w-20" />
        <div className="skeleton-row ml-auto h-2.5 w-14" />
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 border-b border-[#E2E0D8] px-3 py-3 last:border-b-0"
        >
          <div className="skeleton-row h-3 w-16" />
          <div className="skeleton-row h-3 w-40" />
          <div className="skeleton-row h-3 w-24" />
          <div className="skeleton-row ml-auto h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonPanel({ label = "Loading analytics" }: { label?: string }) {
  return (
    <div
      className="border border-[#E2E0D8] bg-[#FCFBF9] p-4"
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      <div className="flex items-center justify-between gap-4 border-b border-[#E2E0D8] pb-3">
        <div className="skeleton-row h-3 w-48" />
        <div className="skeleton-row h-3 w-24" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-px bg-[#E2E0D8] md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="bg-[#FCFBF9] p-3">
            <div className="skeleton-row h-2.5 w-14" />
            <div className="skeleton-row mt-3 h-5 w-24" />
            <div className="skeleton-row mt-2 h-2.5 w-20" />
          </div>
        ))}
      </div>
      <div className="skeleton-row mt-4 h-72 w-full" />
    </div>
  );
}
