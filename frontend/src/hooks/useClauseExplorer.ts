import { useState, useMemo, useEffect } from 'react';
import type { ClauseNode } from '../data/clauseMockData';
import { api } from '../lib/api';
import { isProcessingStatus } from '../lib/pipelineStatus';

interface FilterState {
  search: string;
  hasObligations: boolean;
  lowConfidence: boolean;
}

export function useClauseExplorer(documentId: string) {
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [allClausesRaw, setAllClausesRaw] = useState<any[]>([]);
  const [allObligationsRaw, setAllObligationsRaw] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    async function loadClauses() {
      try {
        const [clausesData, obsData, docsData] = await Promise.all([
          api.clauses.getByDocument(documentId),
          api.obligations.getObligations(documentId),
          api.documents.list()
        ]);
        setAllClausesRaw(clausesData);
        setAllObligationsRaw(obsData);
        setIsLoading(false); // Stop loading after first successful fetch
        const doc = docsData.find((d: any) => d.document_id === documentId);
        setIsProcessing(isProcessingStatus(doc?.processing_status));
      } catch (err) {
        console.error("Failed to load clauses:", err);
        setIsLoading(false);
      }
    }

    loadClauses();
    
    // Poll every 5 seconds only while the document is still being processed
    if (!isProcessing) return;
    intervalId = setInterval(loadClauses, 5000);

    return () => clearInterval(intervalId);
  }, [documentId, isProcessing]);

  const treeDataRaw = useMemo(() => {
    // Build tree from flat clauses
    const nodes: Record<string, ClauseNode> = {};
    const roots: ClauseNode[] = [];

    // First pass: create a node for every real clause, keyed by clause_id.
    // Only real extracted clauses get nodes here; containers are derived from
    // parents in the second pass so we never create phantom duplicates.
    allClausesRaw.forEach(c => {
      nodes[c.clause_id] = {
        id: c.clause_id,
        title: c.title || `Clause ${c.clause_id}`,
        text: c.text,
        type: 'clause',
        hasObligations: c.has_obligations || false,
        extractionConfidence: 0.9,
        ocrConfidence: 0.9,
        children: []
      };
    });

    // Map each section_number to its real clause node. A parent_section that
    // matches an existing clause PROMOTES that clause into the parent position
    // (instead of creating a separate container node with the same number).
    const bySection: Record<string, ClauseNode> = {};
    allClausesRaw.forEach(c => {
      if (c.section_number && nodes[c.clause_id] && !bySection[c.section_number]) {
        bySection[c.section_number] = nodes[c.clause_id];
      }
    });

    // Synthesize containers only for parents that are NOT real clauses
    // (e.g. chapters, or parent_section values with no backing clause).
    // Deduped by id so each chapter/section container appears exactly once.
    const containers: Record<string, ClauseNode> = {};
    const getContainer = (key: string, title: string, type: 'chapter' | 'section'): ClauseNode => {
      if (!containers[key]) {
        containers[key] = {
          id: key,
          title: title || key,
          text: '',
          type,
          hasObligations: false,
          extractionConfidence: 1,
          ocrConfidence: 1,
          children: []
        };
      }
      return containers[key];
    };

    // Second pass: link each clause to its parent
    allClausesRaw.forEach(c => {
      const node = nodes[c.clause_id];
      const parent = c.parent_section && bySection[c.parent_section]
        ? bySection[c.parent_section]
        : c.parent_section
          ? getContainer(c.parent_section, c.parent_section, 'section')
          : c.chapter
            ? getContainer(c.chapter, c.chapter_title || c.chapter, 'chapter')
            : null;
      if (parent) {
        parent.children!.push(node);
        parent.hasObligations = parent.hasObligations || node.hasObligations;
      } else {
        roots.push(node);
      }
    });

    // Any synthesized container that was not attached to a real parent is a root
    Object.values(containers).forEach(n => {
      if (!roots.includes(n)) {
        roots.push(n);
      }
    });

    return roots;
  }, [allClausesRaw]);

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    hasObligations: false,
    lowConfidence: false,
  });

  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const flattenClauses = (nodes: ClauseNode[]): ClauseNode[] => {
    return nodes.reduce((acc: ClauseNode[], node: ClauseNode) => {
      acc.push(node);
      if (node.children && node.children.length > 0) {
        acc = acc.concat(flattenClauses(node.children));
      }
      return acc;
    }, []);
  };

  const allClauses = useMemo(() => flattenClauses(treeDataRaw), [treeDataRaw]);

  const selectedClause = useMemo(() => {
    if (!selectedClauseId) return null;
    return allClauses.find(c => c.id === selectedClauseId) || null;
  }, [allClauses, selectedClauseId]);

  const relatedObligations = useMemo(() => {
    if (!selectedClauseId) return [];
    return allObligationsRaw.filter(o => o.clause_id === selectedClauseId).map(o => ({
      id: o.id || o._id,
      clauseId: o.clause_id,
      summary: o.action,
      type: o.is_mandatory ? 'Mandatory' : 'Conditional',
      role: o.actor,
      trigger: o.frequency || o.condition || 'N/A',
      confidence: o.confidence_score
    }));
  }, [allObligationsRaw, selectedClauseId]);

  const nextClause = () => {
    if (!selectedClauseId) return;
    const currentIndex = allClauses.findIndex(c => c.id === selectedClauseId);
    if (currentIndex >= 0 && currentIndex < allClauses.length - 1) {
      // Find the next node that doesn't have children (leaf node / actual clause)
      let nextIndex = currentIndex + 1;
      while (nextIndex < allClauses.length && allClauses[nextIndex].children && allClauses[nextIndex].children!.length > 0) {
        nextIndex++;
      }
      if (nextIndex < allClauses.length) {
         setSelectedClauseId(allClauses[nextIndex].id);
      }
    }
  };

  const prevClause = () => {
    if (!selectedClauseId) return;
    const currentIndex = allClauses.findIndex(c => c.id === selectedClauseId);
    if (currentIndex > 0) {
      let prevIndex = currentIndex - 1;
      while (prevIndex >= 0 && allClauses[prevIndex].children && allClauses[prevIndex].children!.length > 0) {
        prevIndex--;
      }
      if (prevIndex >= 0) {
        setSelectedClauseId(allClauses[prevIndex].id);
      }
    }
  };

  // Basic filtering for the tree (if needed)
  const filteredTreeData = useMemo(() => {
    if (!filters.search && !filters.hasObligations && !filters.lowConfidence) {
      return treeDataRaw;
    }

    const filterNode = (node: ClauseNode): ClauseNode | null => {
      const searchMatch = !filters.search || 
        node.title.toLowerCase().includes(filters.search.toLowerCase()) || 
        node.text.toLowerCase().includes(filters.search.toLowerCase());
        
      const obligationsMatch = !filters.hasObligations || node.hasObligations;
      const confidenceMatch = !filters.lowConfidence || node.extractionConfidence < 0.95 || node.ocrConfidence < 0.95;

      // Leaf node logic
      if (!node.children || node.children.length === 0) {
        if (searchMatch && obligationsMatch && confidenceMatch) {
          return node;
        }
        return null;
      }

      // Branch node logic
      const filteredChildren = node.children
        .map(filterNode)
        .filter((child): child is ClauseNode => child !== null);

      if (filteredChildren.length > 0 || (searchMatch && obligationsMatch && confidenceMatch)) {
        return {
          ...node,
          children: filteredChildren
        };
      }
      
      return null;
    };

    return treeDataRaw
      .map(filterNode)
      .filter((node): node is ClauseNode => node !== null);
  }, [filters, treeDataRaw]);

  const dynamicDocumentStats = useMemo(() => {
    const pages = new Set(allClausesRaw.map(c => c.page_number)).size;
    const chapters = new Set(allClausesRaw.map(c => c.chapter).filter(Boolean)).size;
    const sections = new Set(allClausesRaw.map(c => c.parent_section).filter(Boolean)).size;
    
    return {
      pages: pages > 0 ? pages : 1,
      chapters: chapters,
      sections: sections,
      clauses: allClausesRaw.length,
      subClauses: 0,
      obligations: allObligationsRaw.length,
    };
  }, [allClausesRaw, allObligationsRaw]);

  return {
    documentStats: dynamicDocumentStats,
    treeData: filteredTreeData,
    selectedClauseId,
    setSelectedClauseId,
    selectedClause,
    expandedNodes,
    toggleNodeExpansion,
    filters,
    setFilters,
    relatedObligations,
    nextClause,
    prevClause,
    hasNext: allClauses.findIndex(c => c.id === selectedClauseId) < allClauses.length - 1,
    hasPrev: allClauses.findIndex(c => c.id === selectedClauseId) > 0,
    isLoading
  };
}
