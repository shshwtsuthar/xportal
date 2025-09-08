"use client";

export default function StepError({ reset }: { reset: () => void }) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold">Step 3 encountered an error</h2>
      <button className="mt-3 underline" onClick={() => reset()} aria-label="Retry">Retry</button>
    </div>
  );
}


