"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, Monitor } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function AgentManagementCollapsible({ children }: { children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div
        className={cn(
          "rounded-2xl border shadow-2xl transition-all duration-300 overflow-hidden",
          "bg-card backdrop-blur-xl dark:bg-card/95",
          "border-border/50",
          "animate-in slide-in-from-bottom-4 fade-in duration-500",
          isExpanded ? "w-[420px] max-w-[90vw]" : "w-auto min-w-[280px]"
        )}
      >
        {isExpanded ? (
          <>
            <button
              type="button"
              className="flex items-center justify-between px-5 py-3.5 bg-background cursor-pointer hover:bg-muted/30 transition-colors w-full"
              onClick={() => setIsExpanded(false)}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[#6D28D9]/10 text-[#6D28D9] dark:bg-[#7C3AED]/20 dark:text-[#A78BFA]">
                  <Monitor className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  Gestión del ticket
                </span>
              </div>
              <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
            </button>

            <div className="px-5 pb-5 pt-2 flex flex-col gap-3">
              {children}
            </div>
          </>
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-muted/30 transition-colors w-full rounded-2xl bg-background"
          >
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[#6D28D9]/10 text-[#6D28D9] dark:bg-[#7C3AED]/20 dark:text-[#A78BFA]">
              <Monitor className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-foreground">Gestión del ticket</span>
            <div className="ml-auto flex items-center gap-2">
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
