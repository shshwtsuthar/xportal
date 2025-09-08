"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void; }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body className="bg-background text-foreground">
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground">An unexpected error occurred.</p>
          <button className="px-4 py-2 rounded border" onClick={() => reset()} aria-label="Try again">Try again</button>
        </div>
      </body>
    </html>
  );
}


