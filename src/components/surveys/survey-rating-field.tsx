"use client";

import { useId } from "react";
import { SURVEY_RATING_STYLES, SURVEY_RATING_SELECTED_STYLES } from "@/lib/constants/tickets";
import { cn } from "@/lib/utils/cn";
import type { SurveyRating } from "@/types";

interface SurveyRatingFieldProps {
  question: string;
  lowLabel: string;
  highLabel: string;
  value?: SurveyRating | null;
  onValueChange: (rating: SurveyRating) => void;
  disabled?: boolean;
}

export function SurveyRatingField({ question, lowLabel, highLabel, value, onValueChange, disabled = false }: SurveyRatingFieldProps) {
  const id = useId();

  return (
    <fieldset disabled={disabled} aria-describedby={`${id}-low ${id}-high`} className="min-w-0 space-y-2">
      <legend className="text-sm font-medium text-foreground">{question}</legend>
      <div className="grid grid-cols-2 gap-x-1.5 gap-y-1.5 sm:grid-cols-[4rem_1fr_4rem] sm:items-center">
        <span id={`${id}-low`} className="order-2 text-[10px] text-muted-foreground sm:order-1 sm:text-right">
          {lowLabel}
        </span>
        <div className="order-1 col-span-2 flex justify-center gap-1 sm:gap-1.5 sm:order-2 sm:col-span-1">
          {([1, 2, 3, 4, 5] as const).map((rating) => (
            <div key={rating} className="relative">
              <input
                id={`${id}-${rating}`}
                type="radio"
                name={id}
                value={rating}
                checked={value === rating}
                onChange={() => onValueChange(rating)}
                aria-label={`${rating} de 5`}
                className="peer sr-only"
              />
              <label
                htmlFor={`${id}-${rating}`}
                className={cn(
                  "flex size-9 cursor-pointer items-center justify-center rounded-lg border text-sm font-bold",
                  "peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-background",
                  "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
                  value === rating ? SURVEY_RATING_SELECTED_STYLES[rating] : SURVEY_RATING_STYLES[rating]
                )}
              >
                {rating}
              </label>
            </div>
          ))}
        </div>
        <span id={`${id}-high`} className="order-3 text-right text-[10px] text-muted-foreground sm:text-left">
          {highLabel}
        </span>
      </div>
    </fieldset>
  );
}
