"""
Service Dependency Graph & Topology Engine.
Maintains directed acyclic and cyclic service topology, computes shortest paths,
and identifies upstream failure propagation directionality.
"""

from typing import Dict, List, Set, Tuple, Optional
from collections import deque


class TopologyGraph:
    def __init__(self):
        # directed edges: u -> v means u depends on v, or request flows from u to v
        self.adj_directed: Dict[str, Set[str]] = {}
        # undirected for distance computation
        self.adj_undirected: Dict[str, Set[str]] = {}
        self.edges: List[Dict[str, str]] = []
        self.nodes: Set[str] = set()

    def add_edge(self, source: str, target: str, dep_type: str = "http", criticality: str = "high"):
        self.nodes.add(source)
        self.nodes.add(target)
        self.edges.append({
            "source": source,
            "target": target,
            "dependency_type": dep_type,
            "criticality": criticality
        })
        if source not in self.adj_directed:
            self.adj_directed[source] = set()
        self.adj_directed[source].add(target)

        if source not in self.adj_undirected:
            self.adj_undirected[source] = set()
        if target not in self.adj_undirected:
            self.adj_undirected[target] = set()
        self.adj_undirected[source].add(target)
        self.adj_undirected[target].add(source)

    def shortest_distance(self, u: str, v: str) -> int:
        """Returns the shortest undirected hop distance between two services. Returns 999 if disconnected."""
        if u == v:
            return 0
        if u not in self.adj_undirected or v not in self.adj_undirected:
            return 999

        queue = deque([(u, 0)])
        visited = {u}

        while queue:
            curr, dist = queue.popleft()
            if curr == v:
                return dist
            for neighbor in self.adj_undirected.get(curr, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, dist + 1))
        return 999

    def find_path(self, start: str, end: str) -> List[str]:
        """Finds directed or undirected path between start and end."""
        if start == end:
            return [start]
        queue = deque([[start]])
        visited = {start}
        while queue:
            path = queue.popleft()
            node = path[-1]
            if node == end:
                return path
            for neighbor in self.adj_undirected.get(node, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    new_path = list(path)
                    new_path.append(neighbor)
                    queue.append(new_path)
        return []

    def get_upstream_depth(self, service: str) -> int:
        """
        Calculates depth from edge ingress.
        Services deeper in the architecture (e.g. databases, message queues)
        have higher depth and are common root causes for downstream timeouts.
        """
        # Ingress roots: CDN, Load Balancer
        roots = {"CDN", "Load Balancer"}
        min_dist = 999
        for root in roots:
            d = self.shortest_distance(root, service)
            if d < min_dist:
                min_dist = d
        return min_dist if min_dist != 999 else 0
