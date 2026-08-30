# Crypto Review Lab — System Architecture Document
**Version:** AVF-F3-v3.2 (Evaluation Blueprint v2.4)  
**Status:** Canonical & Enforced  

---

## 1. Overview & Tripartite Core Architecture

The Algorithmic Verification Framework (AVF) is structured as a **Tripartite Core** combining multi-pass candidate generation, independent reviewer convergence, and zero-AI deterministic verification:

```
┌─────────────────────────┐     ┌─────────────────────────┐     ┌────────────────────────────────┐
│   F1: Candidate Engine   │ ──> │   F2: Reviewer Stage    │ ──> │ F3: Deterministic Verification │
│  (Multi-Vector Baseline)│     │  (Drift Convergence)   │     │      (8 Algorithmic Modules)   │
└─────────────────────────┘     └─────────────────────────┘     └────────────────────────────────┘
                                                                                 │
                                                                                 ▼
                                                                ┌────────────────────────────────┐
                                                                │  Auditor Sign-off & Delivery   │
                                                                │  (Ed25519 / SHA-256 Signed)    │
                                                                └────────────────────────────────┘
```

1. **F1 Candidate Engine:** Ingests live telemetry from CoinGecko, CoinMarketCap, and DefiLlama to draft initial dimension ratings, tokenomics projections, and risk summaries.
2. **F2 Reviewer Stage (Phase 2 Automated Re-Control):** Executes Gate 0 (Structural Completeness) and 7 content verification gates to test invariants and enforce Score Drift convergence strictly below `< 3.0 points`.
3. **F3 Deterministic Verification Layer:** Executes **8 deterministic algorithmic verification modules** with **ZERO AI / LLM calls**, generating verifiable audits with cryptographic proof.

---

## 2. Evaluation Blueprint v2.4 Weight Distribution

Under Evaluation Blueprint v2.4, default evaluation weights are strictly calibrated to sum to **100.0%**:

| Evaluation Dimension | Blueprint v2.4 Weight | Description |
| :--- | :---: | :--- |
| **Utility** | **25%** (`0.25`) | Protocol value proposition, fee capture, and adoption depth. |
| **Tokenomics** | **25%** (`0.25`) | Circulating/Total supply ratio, unlock cliff risk, and emission sustainability. |
| **Security** | **25%** (`0.25`) | Smart contract audits, bytecode invariants, and vulnerability history. |
| **Team & Backing** | **15%** (`0.15`) | Team transparency, engineering track record, and institutional backers. |
| **Community & Ecosystem** | **10%** (`0.10`) | Social engagement, developer activity, and ecosystem liquidity depth. |
| **Total Composite** | **100%** (`1.00`) | Standard baseline weighted composite score. |

*(Note: Category-specific adjustments like DeFi Protocol 35% Security / 10% Team also strictly reconcile to 100.0%).*

---

## 3. F3 Deterministic Verification Modules (8 Modules)

The F3 verification layer runs 8 deterministic modules sequentially:

### Module 1: AVF-01 — Classification & Taxonomy Verification
- **Purpose:** Verifies protocol categorization against standard CoinGecko and Blueprint taxonomy.
- **Inputs:** `category`, `coingeckoCategories`, `name`, `symbol`, `summary`.
- **Output:** Categorization match status, keyword agreement, and taxonomy confidence.

### Module 2: AVF-02 — Evidence & Source Provenance Verification
- **Purpose:** Validates the presence of public citations, verified smart contract addresses, and real-time security telemetry.
- **Inputs:** `citations`, `contractAddress`, `securityScan`, `proBenchmarks`.
- **Output:** Citation count verification and provenance completeness status.

### Module 3: AVF-03 — Methodology & Weighting Compliance
- **Purpose:** Verifies that the declared Blueprint v2.4 category-specific weighting formula was applied with zero unauthorized formula drift.
- **Output:** `VERIFIED` if underlying weighted math matches declared rubric.

### Module 4: AVF-04 — Scenario Bounds & Liquidity Stress Testing
- **Purpose:** Evaluates price shock scenarios (-30%, -60%, -85%) and liquidity drain thresholds.
- **Output:** Status returns `PASSED` (100% scenario resilience), `SIMULATED_WITH_WARNINGS` (70%), `NARRATIVE_ONLY` (40%), or `FAILED` / `INPUT_MISSING`.

### Module 5: AVF-05 — Score Arithmetic & Weight Verification
- **Purpose:** Recomputes the weighted composite score to double precision:
  $$\text{Recomputed} = ((U \times W_u) + (T \times W_t) + (S \times W_s) + (Tm \times W_{tm}) + (C \times W_c)) \times 10$$
- **Discrepancy Threshold:** Must be $\le 0.5\text{ pts}$ to receive `VERIFIED`.

### Module 6: AVF-06 — Risk-Conclusion Semantic Consistency
- **Purpose:** Verifies that declared risk level and letter grade are semantically consistent with calculated scores and verified security telemetry signals.
- **Output:** `CONSISTENT` (0 contradictions), `REQUIRES_REVIEW` (material divergence), or `CONFLICT` (critical contradiction).

### Module 7: AVF-07 — Deterministic Multi-Source Confidence
- **Purpose:** Computes composite statistical confidence across underlying modules.
- **Formula:** See Section 4 for the exact mathematical formula.

### Module 8: AVF-08 — Traceability & Cryptographic Integrity
- **Purpose:** Guarantees cryptographic audit report integrity and prevents tampering.
- **Requirements:** See Section 5 for digital signing specifications.

---

## 4. AVF-07 Confidence Formula Specification

The AVF-07 multi-source confidence calculation computes a deterministic weighted composite score across 4 sub-signals:

$$\text{Confidence} = (0.20 \times C_{\text{class}}) + (0.30 \times C_{\text{prov}}) + (0.30 \times C_{\text{scen}}) + (0.20 \times C_{\text{risk}})$$

### Sub-Signal Weights & Mapping:
1. **$C_{\text{class}}$ (Classification Confidence — 20%):**
   - Direct confidence from AVF-01 taxonomy matching (`avf01.classificationConfidence`, 0.0 to 1.0).
2. **$C_{\text{prov}}$ (Provenance Confidence — 30%):**
   - Direct confidence from AVF-02 evidence coverage (`avf02.evidenceCoveragePct`, 0.0 to 1.0).
3. **$C_{\text{scen}}$ (Scenario Confidence — 30%):**
   - Direct execution rate from AVF-04 stress simulations (`avf04.scenarioExecutionRate`, 0.0 to 1.0).
4. **$C_{\text{risk}}$ (Semantic Consistency Confidence — 20%):**
   - `1.0` (100%) when AVF-06 status is `CONSISTENT`.
   - `0.60` (60%) when AVF-06 status is `REQUIRES_REVIEW`.
   - `0.20` (20%) when AVF-06 status is `CONFLICT`.
   - `0.0` when input signals are missing.

### Confidence Thresholds:
- **HIGH:** $\ge 85\%$ (0.85) — Ready for immediate institutional reporting.
- **MODERATE:** $70\% - 84\%$ — Partial telemetry present; narrative verification noted.
- **LOW / CAUTION:** $< 70\%$ — Requires additional source telemetry.

---

## 5. AVF-08 Cryptographic Integrity & Signing Requirements

AVF-08 ensures complete cryptographic audit trail traceability and immutability:

### Canonical Digest Generation (SHA-256):
Every report generates a canonical SHA-256 hash payload composed of:
$$\text{Payload} = \text{SHA256}(\text{Symbol} \parallel \text{Scores} \parallel \text{Grade} \parallel \text{OverallScore} \parallel \text{Timestamp})$$

### Signing Requirements:
1. **System Draft State:**
   - When a draft is newly generated before human audit completion, status is `UNSIGNED`.
   - The report displays the calculated digest with "Pending Final Sign-Off" status.
2. **Auditor Final Delivery State:**
   - The lead auditor inspects the draft, applies notes, and executes cryptographic signing.
   - Generates an Ed25519 digital signature (`auditSignature.signatureHash`).
   - AVF-08 verifies signature authenticity, timestamp integrity, and public key fingerprint, transitioning status to `VERIFIED` / `HASH_MATCH`.
3. **Immutability Protection:**
   - Any modification to dimension scores, verdict text, or grade invalidates the digital signature hash immediately (`HASH_MISMATCH` / `SIGNATURE_INVALID`).
