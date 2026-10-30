import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buildSurveyPageHref } from "@/lib/surveys/pagination";
import type { getSurveyPagination } from "@/lib/surveys/pagination";

interface SurveyPaginationProps {
  pagination: ReturnType<typeof getSurveyPagination>;
  queryString: string;
  itemLabel?: string;
  ariaLabel?: string;
}

export function SurveyPagination({ pagination, queryString, itemLabel = "encuestas", ariaLabel = "Paginación de encuestas" }: SurveyPaginationProps) {
  if (!pagination.total) return null;
  const { page, pageCount, from, to, total } = pagination;
  return (
    <nav aria-label={ariaLabel} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">Mostrando {from}–{to} de {total} {itemLabel}</p>
      <div className="flex items-center gap-3">
        {page > 1 ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={buildSurveyPageHref(queryString, page - 1)} rel="prev">Anterior</Link>
          </Button>
        ) : <Button variant="outline" size="sm" disabled>Anterior</Button>}
        <span className="text-sm" aria-live="polite">Página {page} de {pageCount}</span>
        {page < pageCount ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={buildSurveyPageHref(queryString, page + 1)} rel="next">Siguiente</Link>
          </Button>
        ) : <Button variant="outline" size="sm" disabled>Siguiente</Button>}
      </div>
    </nav>
  );
}
