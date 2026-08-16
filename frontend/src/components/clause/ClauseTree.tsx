import { ChevronRight, ChevronDown } from 'lucide-react';
import type { ClauseNode } from '../../data/clauseMockData';

interface ClauseTreeProps {
  data: ClauseNode[];
  selectedClauseId: string | null;
  onSelectClause: (id: string) => void;
  expandedNodes: Set<string>;
  toggleExpansion: (id: string) => void;
  level?: number;
}

export function ClauseTree({
  data,
  selectedClauseId,
  onSelectClause,
  expandedNodes,
  toggleExpansion,
  level = 0
}: ClauseTreeProps) {
  return (
    <ul className={`flex flex-col ${level > 0 ? 'ml-4 border-l border-border/50 pl-2 mt-1' : 'gap-1'}`}>
      {data.map((node) => {
        const isExpanded = expandedNodes.has(node.id);
        const hasChildren = node.children && node.children.length > 0;
        const isSelected = selectedClauseId === node.id;
        
        return (
          <li key={node.id} className="relative">
            <div
              className={`flex items-start gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors ${
                isSelected 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : 'hover:bg-muted text-foreground'
              }`}
              onClick={() => {
                if (hasChildren) {
                  toggleExpansion(node.id);
                } else {
                  onSelectClause(node.id);
                }
              }}
            >
              {hasChildren ? (
                <button 
                  className="mt-0.5 shrink-0 hover:bg-black/5 rounded p-0.5 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpansion(node.id);
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>
              ) : (
                <div className="w-4 h-4 shrink-0 mt-0.5 flex items-center justify-center">
                  <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                </div>
              )}
              
              <div className="flex-1 text-sm overflow-hidden text-ellipsis">
                <div className="flex items-center gap-1.5">
                  <span className={hasChildren ? "font-medium" : ""}>
                    {node.clauseNumber ? `${node.clauseNumber} ` : ''}{node.title}
                  </span>
                  {!hasChildren && node.hasObligations && (
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" title="Has obligations" />
                  )}
                </div>
              </div>
            </div>
            
            {hasChildren && isExpanded && (
              <ClauseTree
                data={node.children!}
                selectedClauseId={selectedClauseId}
                onSelectClause={onSelectClause}
                expandedNodes={expandedNodes}
                toggleExpansion={toggleExpansion}
                level={level + 1}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
