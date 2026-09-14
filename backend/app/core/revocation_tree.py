from app.db.session import SessionLocal
from app.db.models import MerkleMeta
from app.core.merkle import SparseMerkleTree, LEVELS, nullifier_position
from app.core.chain import publish_revocation_root


def _load_tree() -> SparseMerkleTree:
    db = SessionLocal()
    try:
        row = db.query(MerkleMeta).filter(MerkleMeta.id == 1).first()
        occupied = (row.occupied_leaves if row else None) or {}
        return SparseMerkleTree(occupied=occupied, levels=(row.depth if row else LEVELS))
    finally:
        db.close()


def _save_tree(tree: SparseMerkleTree, publish: bool = True) -> str:
    root = tree.root()
    db = SessionLocal()
    try:
        row = db.query(MerkleMeta).filter(MerkleMeta.id == 1).first()
        if row is None:
            row = MerkleMeta(id=1, root=str(root), depth=tree.levels, occupied_leaves=tree.snapshot())
            db.add(row)
        else:
            row.root = str(root)
            row.occupied_leaves = tree.snapshot()
        db.commit()
    finally:
        db.close()
    if publish:
        try:
            publish_revocation_root(root)
        except Exception as exc:
            print(f"Failed to publish revocation root: {exc}")
    return str(root)


def current_root() -> str:
    return str(_load_tree().root())


def proof_for_nullifier(nullifier: int) -> dict:
    tree = _load_tree()
    pos = nullifier_position(int(nullifier), tree.levels)
    proof = tree.proof(pos)
    proof["position"] = str(pos)
    proof["nullifier"] = str(nullifier)
    return proof


def mark_revoked(nullifier: int) -> str:
    tree = _load_tree()
    tree.set_leaf(nullifier_position(int(nullifier), tree.levels), 1)
    return _save_tree(tree, publish=True)
