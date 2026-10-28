'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log del error al console para debugging
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100vh-100px)] items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">
            Algo salió mal
          </h1>
          <p className="text-muted-foreground">
            Ocurrió un error inesperado al cargar el dashboard.
            Por favor, intenta de nuevo.
          </p>
          {error.message && (
            <div className="mt-4 rounded-md bg-muted p-3 text-sm text-left">
              <p className="font-mono text-xs text-muted-foreground break-all">
                {process.env.NODE_ENV === 'development'
                  ? error.message
                  : error.digest
                    ? `Código de error: ${error.digest}`
                    : 'Error interno del servidor'
                }
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={reset}
            className="w-full"
          >
            Intentar de nuevo
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full"
          >
            <Link href="/dashboard" prefetch={false}>Volver al inicio</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
