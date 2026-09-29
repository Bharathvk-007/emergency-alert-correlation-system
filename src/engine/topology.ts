import { TopologyEdge } from '../types';

export class TopologyGraph {
  adjDirected: Map<string, Set<string>> = new Map();
  adjReverseDirected: Map<string, Set<string>> = new Map();
  adjUndirected: Map<string, Set<string>> = new Map();
  edges: TopologyEdge[] = [];
  nodes: Set<string> = new Set();

  constructor(initialEdges: TopologyEdge[] = []) {
    initialEdges.forEach((e) => this.addEdge(e));
  }

  addEdge(edge: TopologyEdge) {
    this.edges.push(edge);
    this.nodes.add(edge.source_service);
    this.nodes.add(edge.target_service);

    // Forward directed: source -> target
    if (!this.adjDirected.has(edge.source_service)) {
      this.adjDirected.set(edge.source_service, new Set());
    }
    this.adjDirected.get(edge.source_service)!.add(edge.target_service);

    // Reverse directed: target -> source
    if (!this.adjReverseDirected.has(edge.target_service)) {
      this.adjReverseDirected.set(edge.target_service, new Set());
    }
    this.adjReverseDirected.get(edge.target_service)!.add(edge.source_service);

    // Undirected
    if (!this.adjUndirected.has(edge.source_service)) {
      this.adjUndirected.set(edge.source_service, new Set());
    }
    if (!this.adjUndirected.has(edge.target_service)) {
      this.adjUndirected.set(edge.target_service, new Set());
    }
    this.adjUndirected.get(edge.source_service)!.add(edge.target_service);
    this.adjUndirected.get(edge.target_service)!.add(edge.source_service);
  }

  shortestDistance(u: string, v: string): number {
    if (u === v) return 0;
    if (!this.adjUndirected.has(u) || !this.adjUndirected.has(v)) return 999;

    const queue: [string, number][] = [[u, 0]];
    const visited = new Set<string>([u]);

    while (queue.length > 0) {
      const [curr, dist] = queue.shift()!;
      if (curr === v) return dist;

      const neighbors = this.adjUndirected.get(curr) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([neighbor, dist + 1]);
        }
      }
    }
    return 999;
  }

  findShortestPath(start: string, end: string): string[] {
    if (start === end) return [start];
    if (!this.adjUndirected.has(start) || !this.adjUndirected.has(end)) return [];

    const queue: string[][] = [[start]];
    const visited = new Set<string>([start]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const node = path[path.length - 1];
      if (node === end) return path;

      const neighbors = this.adjUndirected.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }
    return [];
  }

  /**
   * Computes the downstream blast radius: all services reachable
   * if `rootService` experiences degradation.
   */
  getDownstreamBlastRadius(rootService: string): string[] {
    const reachable: string[] = [];
    const queue: string[] = [rootService];
    const visited = new Set<string>([rootService]);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      // Find downstream consumers that depend on curr (via reverse lookup or forward edge depending on semantics)
      const consumers = this.adjReverseDirected.get(curr) || new Set();
      for (const consumer of consumers) {
        if (!visited.has(consumer)) {
          visited.add(consumer);
          reachable.push(consumer);
          queue.push(consumer);
        }
      }
    }
    return reachable;
  }

  /**
   * Computes the reverse causal path from a symptom service back up to
   * candidate root causes.
   */
  getReverseUpstreamPath(symptomService: string, rootService: string): string[] {
    if (symptomService === rootService) return [symptomService];
    // Directed path in reverse or shortest path
    return this.findShortestPath(symptomService, rootService);
  }

  getUpstreamDepth(service: string): number {
    const roots = ['CDN', 'Load Balancer'];
    let minDistance = 999;
    for (const r of roots) {
      const d = this.shortestDistance(r, service);
      if (d < minDistance) minDistance = d;
    }
    return minDistance === 999 ? 0 : minDistance;
  }
}
