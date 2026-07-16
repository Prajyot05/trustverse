class TrustScoreEngine:
    """
    Calculates a comprehensive Trust Score (0-100) for a credential or digital asset 
    by fusing deterministic on-chain data and probabilistic AI signals.
    """
    
    def __init__(self):
        # Weights for different signals
        self.weights = {
            "ai_authenticity": 0.40,      # High weight for structural integrity
            "issuer_reputation": 0.30,    # Weight of the issuing entity's history
            "on_chain_verification": 0.20, # Validity on blockchain (not revoked)
            "lineage_depth": 0.10          # Has parent credentials (trust graph)
        }

    def calculate_score(self, 
                        ai_score: float, 
                        issuer_verified: bool, 
                        is_revoked: bool, 
                        lineage_depth: int) -> dict:
        """
        Calculate the final trust score.
        
        Args:
            ai_score (float): Probability of authenticity (0.0 to 1.0)
            issuer_verified (bool): Is the issuer registered and active?
            is_revoked (bool): Is the credential revoked?
            lineage_depth (int): How deep is the credential's ancestry in the Trust Graph?
        """
        # 1. Fatal flaw check
        if is_revoked:
            return {"score": 0, "status": "REJECTED", "reason": "Credential has been revoked"}
            
        if not issuer_verified:
            return {"score": 0, "status": "REJECTED", "reason": "Issuer is not verified"}

        # 2. Score Calculation (max 100)
        
        # AI Component (0-40 points)
        ai_component = ai_score * self.weights["ai_authenticity"] * 100
        
        # Issuer Component (30 points if verified, else 0, but we already handled unverified)
        issuer_component = self.weights["issuer_reputation"] * 100
        
        # On-chain Component (20 points since it's not revoked)
        on_chain_component = self.weights["on_chain_verification"] * 100
        
        # Lineage Component (0-10 points based on depth, caps at 3)
        normalized_depth = min(lineage_depth, 3) / 3.0
        lineage_component = normalized_depth * self.weights["lineage_depth"] * 100

        total_score = ai_component + issuer_component + on_chain_component + lineage_component

        # 3. Status determination
        if total_score >= 90:
            status = "EXCELLENT"
        elif total_score >= 75:
            status = "GOOD"
        elif total_score >= 50:
            status = "WARNING"
        else:
            status = "DANGEROUS"

        return {
            "score": round(total_score, 1),
            "status": status,
            "components": {
                "ai_points": round(ai_component, 1),
                "issuer_points": round(issuer_component, 1),
                "onchain_points": round(on_chain_component, 1),
                "lineage_points": round(lineage_component, 1)
            }
        }
