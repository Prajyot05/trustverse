"""
Sparse Merkle tree for NonRevocation proofs.

Mirrors circuits/NonRevocation.circom:
  nullifier = Poseidon(claimsHash, salt)
  position  = low `LEVELS` bits of nullifier (LSB-first, matching Num2Bits)
  leaf      = 0 if not revoked, 1 if revoked
  internal  = Poseidon(left, right)
"""
from typing import Dict, List, Tuple

from app.core.poseidon import poseidon_hash

LEVELS = 20


def _bits_le(value: int, levels: int) -> List[int]:
    return [(value >> i) & 1 for i in range(levels)]


class SparseMerkleTree:
    def __init__(self, occupied: Dict[str, int] = None, levels: int = LEVELS):
        self.levels = levels
        self.occupied: Dict[int, int] = {int(k): int(v) for k, v in (occupied or {}).items()}
        self.empty = [0]
        for _ in range(levels):
            self.empty.append(poseidon_hash([self.empty[-1], self.empty[-1]]))

    def snapshot(self) -> Dict[str, int]:
        return {str(k): int(v) for k, v in self.occupied.items()}

    def set_leaf(self, position: int, value: int = 1) -> None:
        mask = (1 << self.levels) - 1
        self.occupied[int(position) & mask] = int(value)

    def _subtree_hash(self, index: int, height: int, cache: Dict[Tuple[int, int], int]) -> int:
        key = (index, height)
        if key in cache:
            return cache[key]
        width = 1 << height
        start = index * width
        end = start + width
        if height == 0:
            result = int(self.occupied.get(start, 0))
        else:
            occupied_here = any(start <= p < end for p in self.occupied)
            if not occupied_here:
                result = self.empty[height]
            else:
                left = self._subtree_hash(index * 2, height - 1, cache)
                right = self._subtree_hash(index * 2 + 1, height - 1, cache)
                result = poseidon_hash([left, right])
        cache[key] = result
        return result

    def root(self) -> int:
        return self._subtree_hash(0, self.levels, {})

    def proof(self, position: int) -> Dict[str, object]:
        """Return pathElements (decimal strings) and current root for `position`."""
        cache: Dict[Tuple[int, int], int] = {}
        path_elements = []
        idx = int(position) & ((1 << self.levels) - 1)
        for height in range(self.levels):
            sibling = idx ^ 1
            path_elements.append(self._subtree_hash(sibling, height, cache))
            idx >>= 1
        return {
            "pathElements": [str(x) for x in path_elements],
            "root": str(self.root()),
            "leaf": str(self.occupied.get(int(position) & ((1 << self.levels) - 1), 0)),
        }


def nullifier_position(nullifier: int, levels: int = LEVELS) -> int:
    return int(nullifier) & ((1 << levels) - 1)
