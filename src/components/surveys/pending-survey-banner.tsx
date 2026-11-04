"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { submitSurveyAction } from "@/actions/surveys";
import { toast } from "sonner";
import { Star, Send, SkipForward, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SURVEY_QUESTIONS } from "@/lib/constants/tickets";
import { SurveyRatingField } from "@/components/surveys/survey-rating-field";
import type { SurveyRating } from "@/types";

interface FloatingSurveyProps {
  ticketId: number;
}

type SurveyRatings = {
  responseTimeRating: SurveyRating | null;
  communicationRating: SurveyRating | null;
  solutionRating: SurveyRating | null;
  overallRating: SurveyRating | null;
};

export function FloatingSurvey({ ticketId }: FloatingSurveyProps) {
  const [isPending, startTransition] = useTransition();
  const suggestionId = useId();
  const [isExpanded, setIsExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ratings, setRatings] = useState<SurveyRatings>({
    responseTimeRating: null,
    communicationRating: null,
    solutionRating: null,
    overallRating: null,
  });
  const [suggestion, setSuggestion] = useState("");

  if (dismissed || submitted) return null;

  const handleSetRating = (key: keyof SurveyRatings, value: SurveyRating) => {
    setRatings(prev => ({ ...prev, [key]: value }));
  };

  const allRatingsComplete = Object.values(ratings).every(r => r !== null);

  const handleSubmitSurvey = () => {
    if (!allRatingsComplete) return;

    startTransition(async () => {
      const result = await submitSurveyAction({
        ticketId,
        responseTimeRating: ratings.responseTimeRating!,
        communicationRating: ratings.communicationRating!,
        solutionRating: ratings.solutionRating!,
        overallRating: ratings.overallRating!,
        improvementSuggestion: suggestion.trim() || undefined,
      });

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Encuesta enviada. Gracias por tu retroalimentación");
        setSubmitted(true);
      }
    });
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div
        className={cn(
          "rounded-2xl border shadow-2xl transition-colors duration-300 overflow-hidden motion-reduce:transition-none",
          "bg-card backdrop-blur-sm",
          "border-border",
          "animate-in slide-in-from-bottom-4 fade-in duration-500 motion-reduce:animate-none",
          isExpanded ? "w-[calc(100vw-2rem)] max-w-[480px] max-h-[85dvh] overflow-y-auto" : "w-auto min-w-[280px] max-w-[calc(100vw-2rem)]"
        )}
      >
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((expanded) => !expanded)}
          className={cn(
            "flex w-full cursor-pointer items-center gap-3 px-5 py-3.5 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
            isExpanded ? "border-b bg-emerald-50/50 dark:bg-emerald-950/20" : "hover:bg-muted/30 transition-colors"
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <Star className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">Encuesta de satisfacción</span>
          <span className="flex shrink-0 items-center gap-2">
            {!isExpanded ? <span className="size-2 rounded-full bg-emerald-500" /> : null}
            {isExpanded
              ? <ChevronDown className="size-5 text-muted-foreground" aria-hidden="true" />
              : <ChevronUp className="size-5 text-muted-foreground" aria-hidden="true" />}
          </span>
        </button>
        {isExpanded ? (
          <div className="px-5 py-4 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tu opinión nos ayuda a mejorar. Califica tu experiencia del 1 al 5.
            </p>

            {/* Questions */}
            {SURVEY_QUESTIONS.map((q) => (
              <SurveyRatingField
                key={q.key}
                question={q.label}
                lowLabel={q.lowLabel}
                highLabel={q.highLabel}
                value={ratings[q.key]}
                onValueChange={(value) => handleSetRating(q.key, value)}
                disabled={isPending}
              />
            ))}

            {/* Improvement Suggestion */}
            <div className="space-y-2">
              <label htmlFor={suggestionId} className="text-sm font-medium text-foreground">
                Sugerencias de mejora <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <textarea
                id={suggestionId}
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                placeholder="¿Cómo podemos mejorar?"
                maxLength={1000}
                disabled={isPending}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 resize-none h-16 disabled:opacity-50"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
              <Button
                onClick={handleSubmitSurvey}
                disabled={!allRatingsComplete || isPending}
                className="flex-1 h-10"
              >
                <Send className="mr-2 h-4 w-4" />
                Enviar encuesta
              </Button>
              <Button
                variant="ghost"
                onClick={() => setDismissed(true)}
                disabled={isPending}
                className="h-10"
              >
                <SkipForward className="mr-2 h-4 w-4" />
                Omitir
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
