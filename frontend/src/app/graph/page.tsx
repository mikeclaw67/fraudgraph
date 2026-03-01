/* FraudGraph — Full-screen Sigma.js WebGL graph explorer with side panel.
   Update when adding new node types, edge types, or changing graph configuration. */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { getGraph } from "@/lib/api";
import { generateMockGraph } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { GraphNode, GraphEdge } from "@/lib/types";

export default function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<unknown>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [fraudOnly, setFraudOnly] = useState(false);
  const [nodeLimit, setNodeLimit] = useState(500);
  const [loading, setLoading] = useState(true);

  // Load graph data
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getGraph({ fraud_only: fraudOnly, limit: nodeLimit });
        setNodes(data.nodes);
        setEdges(data.edges);
      } catch {
        const mock = generateMockGraph();
        setNodes(mock.nodes);
        setEdges(mock.edges);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [fraudOnly, nodeLimit]);

  // Initialize Sigma.js
  const initSigma = useCallback(async () => {
    if (!containerRef.current || nodes.length === 0) return;

    // Cleanup previous instance
    if (sigmaRef.current) {
      try { (sigmaRef.current as { kill: () => void }).kill(); } catch { /* ignore */ }
      sigmaRef.current = null;
    }

    try {
      const { default: Graph } = await import("graphology");
      const { default: Sigma } = await import("sigma");
      const { default: forceAtlas2 } = await import("graphology-layout-forceatlas2");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const graph = new Graph() as any;

      // Add nodes
      nodes.forEach((node) => {
        if (!graph.hasNode(node.id)) {
          graph.addNode(node.id, {
            label: node.label,
            size: node.size,
            color: node.color,
            x: Math.random() * 100,
            y: Math.random() * 100,
            nodeType: node.type,
          });
        }
      });

      // Add edges
      edges.forEach((edge) => {
        if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
          try {
            graph.addEdge(edge.source, edge.target, {
              type: "line",
              color: "#37474F",
              size: 1,
              edgeType: edge.type,
            });
          } catch { /* ignore duplicate edges */ }
        }
      });

      // Run ForceAtlas2 layout
      forceAtlas2.assign(graph, { iterations: 100, settings: { gravity: 1, scalingRatio: 2 } });

      // Create Sigma renderer
      const sigma = new Sigma(graph, containerRef.current, {
        renderEdgeLabels: false,
        defaultEdgeColor: "#37474F",
        labelColor: { color: "#ECEFF1" },
        labelSize: 12,
        labelRenderedSizeThreshold: 8,
      });

      sigma.on("clickNode", ({ node }: { node: string }) => {
        const attrs = graph.getNodeAttributes(node);
        setSelectedNode({
          id: node,
          label: attrs.label as string,
          type: attrs.nodeType as string,
          size: attrs.size as number,
          color: attrs.color as string,
        });
      });

      sigma.on("clickStage", () => setSelectedNode(null));

      sigmaRef.current = sigma;
    } catch (err) {
      console.error("Sigma initialization failed:", err);
    }
  }, [nodes, edges]);

  useEffect(() => { initSigma(); }, [initSigma]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (sigmaRef.current) {
        try { (sigmaRef.current as { kill: () => void }).kill(); } catch { /* ignore */ }
      }
    };
  }, []);

  const NODE_TYPES = [
    { type: "Borrower", color: "#6366f1" },
    { type: "Business", color: "#43A047" },
    { type: "Address", color: "#FFB300" },
    { type: "BankAccount", color: "#E53935" },
  ];

  const EDGE_TYPES = [
    "BORROWER_OWNS_BUSINESS",
    "BUSINESS_LOCATED_AT",
    "APPLICATION_DEPOSITED_TO",
  ];

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Controls overlay */}
      <div className="absolute left-4 top-4 z-10 space-y-3">
        <div className="border border-[#37474F] bg-[#2C3539]/95 p-3 backdrop-blur">
          <h2 className="mb-2 text-sm font-semibold text-[#ECEFF1]">Graph Explorer</h2>
          <p className="text-xs text-[#90A4AE]">{nodes.length} nodes &middot; {edges.length} edges</p>
        </div>

        {/* Filters */}
        <div className="border border-[#37474F] bg-[#2C3539]/95 p-3 backdrop-blur">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#90A4AE]">Filters</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#90A4AE]">
            <input
              type="checkbox"
              checked={fraudOnly}
              onChange={(e) => setFraudOnly(e.target.checked)}
              className="h-4 w-4 border-[#455A64] bg-[#2C3539]"
            />
            Fraud connections only
          </label>
          <div className="mt-2">
            <label className="text-xs text-[#90A4AE]">Node limit: {nodeLimit}</label>
            <input
              type="range"
              min={50}
              max={2000}
              step={50}
              value={nodeLimit}
              onChange={(e) => setNodeLimit(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </div>
        </div>

        {/* Legend */}
        <div className="border border-[#37474F] bg-[#2C3539]/95 p-3 backdrop-blur">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#90A4AE]">Node Types</h3>
          <div className="space-y-1.5">
            {NODE_TYPES.map(({ type, color }) => (
              <div key={type} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs text-[#90A4AE]">{type}</span>
              </div>
            ))}
          </div>
          <h3 className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wider text-[#90A4AE]">Edge Types</h3>
          <div className="space-y-1">
            {EDGE_TYPES.map((type) => (
              <div key={type} className="flex items-center gap-2">
                <div className="h-px w-4 bg-[#546E7A]" />
                <span className="text-[10px] text-[#90A4AE]">{type.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sigma container */}
      <div ref={containerRef} className="h-full w-full bg-[#263238]">
        {loading && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#2196F3] border-t-transparent" />
              <p className="text-sm text-[#90A4AE]">Loading graph data...</p>
            </div>
          </div>
        )}
      </div>

      {/* Side panel */}
      <div
        className={cn(
          "absolute right-0 top-0 z-10 h-full w-80 transform border-l border-[#37474F] bg-[#2C3539]/95 backdrop-blur transition-transform duration-300",
          selectedNode ? "translate-x-0" : "translate-x-full"
        )}
      >
        {selectedNode && (
          <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#ECEFF1]">{selectedNode.label}</h3>
              <button onClick={() => setSelectedNode(null)} className="text-[#90A4AE] hover:text-[#ECEFF1]">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div className="border border-[#37474F] bg-[#2C3539] p-3">
                <p className="text-xs text-[#546E7A]">Node Type</p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedNode.color }} />
                  <span className="text-sm font-medium text-[#ECEFF1]">{selectedNode.type}</span>
                </div>
              </div>
              <div className="border border-[#37474F] bg-[#2C3539] p-3">
                <p className="text-xs text-[#546E7A]">Node ID</p>
                <p className="mt-1 font-mono text-xs text-[#90A4AE]">{selectedNode.id}</p>
              </div>
              <div className="border border-[#37474F] bg-[#2C3539] p-3">
                <p className="text-xs text-[#546E7A]">Node Size (Loan Amount)</p>
                <p className="mt-1 text-sm text-[#ECEFF1]">{selectedNode.size}</p>
              </div>

              {selectedNode.type === "Borrower" && (
                <Link
                  href={`/entity/${selectedNode.id}`}
                  className="block w-full bg-[#2196F3] px-3 py-2 text-center text-sm font-medium text-white hover:bg-[#2196F3]/80"
                >
                  View Full Profile
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
