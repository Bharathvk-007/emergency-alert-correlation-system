"""
Service Dependency Graph & Topology Engine (Milestone 2 - 70%).
Maintains directed acyclic and cyclic service topology, computes shortest paths,
downstream blast radius, and reverse causal symptom paths.
"""

from typing import Dict, List, Set, Tuple, Optional
from collections import deque


class TopologyGraph:
    def __init__(self):
        self.adj_directed: Dict[str, Set[str]] = {}
        self.adj_reverse: Dict[str, Set[str]] = {}
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

        if target not in self.adj_reverse:
            self.adj_reverse[target] = set()
        self.adj_reverse[target].add(source)

        if source not in self.adj_undirected:
            self.adj_undirected[source] = set()
        if target not in self.adj_undirected:
            self.adj_undirected[target] = set()
        self.adj_undirected[source].add(target)
        self.adj_undirected[target].add(source)

    def shortest_distance(self, u: str, v: str) -> int:
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

    def get_downstream_blast_radius(self, root_service: str) -> List[str]:
        """Calculates all downstream consumer services affected if root_service degrades."""
        reachable = []
        queue = deque([root_service])
        visited = {root_service}
        while queue:
            curr = queue.popleft()
            consumers = self.adj_reverse.get(curr, set())
            for c in consumers:
                if c not in visited:
                    visited.add(c)
                    reachable.append(c)
                    queue.append(c)
        return reachable

    def get_reverse_upstream_path(self, symptom_service: str, root_service: str) -> List[str]:
        """Traces from symptom back up to candidate root cause."""
        return self.find_path(symptom_service, root_service)

    def get_upstream_depth(self, service: str) -> int:
        roots = {"CDN", "Load Balancer"}
        min_dist = 999
        for root in roots:
            d = self.shortest_distance(root, service)
            if d < min_dist:
                min_dist = d
        return min_dist if min_dist != 999 else 0
