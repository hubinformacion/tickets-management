"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, User } from "lucide-react";
import type { AgentWorkload } from "@/db/queries/analytics";

interface AgentWorkloadTableProps {
  data: AgentWorkload[];
}

export function AgentWorkloadTable({ data }: AgentWorkloadTableProps) {
  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Carga por agente
        </CardTitle>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {data.length} agentes
        </span>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground gap-2">
            <User className="h-8 w-8 text-muted-foreground/30" />
            <span>Sin agentes asignados</span>
          </div>
        ) : (
          <div className="space-y-1">
            {data.map((agent, index) => (
              <div
                key={agent.agentId}
                className="flex items-center justify-between text-sm py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-muted-foreground w-5 text-center shrink-0">
                    {index + 1}
                  </span>
                  <span className="font-medium truncate max-w-[180px] group-hover:text-foreground transition-colors">
                    {agent.agentName}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-muted-foreground">{agent.open}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-muted-foreground">{agent.inProgress}</span>
                  </div>
                  <div className="w-8 text-right font-bold text-foreground">
                    {agent.total}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
