import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AgentInfo {
  name: string;
  client_count: number;
}

interface AgentListProps {
  agents: AgentInfo[];
  selectedAgent: string | null;
  onSelectAgent: (agent: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isLoading?: boolean;
}

export function AgentList({
  agents,
  selectedAgent,
  onSelectAgent,
  searchQuery,
  onSearchChange,
  isLoading = false,
}: AgentListProps) {
  // Filter agents based on search query
  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <h2 className="text-sm font-semibold mb-3">Agents</h2>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-sm bg-muted/30"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Agent List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Loading agents...</div>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-8">
              {agents.length === 0 ? (
                <>
                  <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">No agents found</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    Import data first
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No agents match "{searchQuery}"
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredAgents.map((agent) => (
                <button
                  key={agent.name}
                  onClick={() => onSelectAgent(agent.name)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors",
                    "hover:bg-accent/50",
                    selectedAgent === agent.name
                      ? "bg-accent border border-accent/70"
                      : "border border-transparent"
                  )}
                >
                  <span className={cn(
                    "text-sm truncate",
                    selectedAgent === agent.name ? "font-semibold" : ""
                  )}>
                    {agent.name}
                  </span>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full shrink-0 ml-2",
                      selectedAgent === agent.name
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {agent.client_count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer with count */}
      <div className="p-3 border-t border-border/50 text-xs text-muted-foreground">
        {filteredAgents.length} agent{filteredAgents.length !== 1 ? "s" : ""}
        {searchQuery && ` found from ${agents.length} total`}
      </div>
    </div>
  );
}
