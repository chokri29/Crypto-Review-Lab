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
2. **F2 Reviewer Stage (Phase 2 Automated Re-Control):** Executes Gate 0 (Structural Completeness) and 7 content verification gates (including Gate 2 — On-Chain Cross-Check, which verifies on-chain scan cleanliness starting from a neutral baseline of 90 when real GoPlus/RugCheck telemetry exists, rather than anchoring to the F1 subjective security dimension; fallback remains F1 security score × 10 when scan telemetry is absent) to test invariants and enforce Score Drift convergence strictly below `< 3.0 points`.
3. **F3 Deterministic Verification Layer:** Executes **8 deterministic algorithmic verification modules** with **ZERO AI / LLM calls**, generating verifiable audits with cryptographic proof.

---

## 2. Evaluation Blueprint v2.4 Weight Distribution & Category Matrix

### 100-Point Master Scoring Formula
A project's numerical score is calculated across 5 core dimensions (evaluated on a 1.0 to 10.0 scale):

$$\text{Score (100)} = (\text{Utility} \times M_U) + (\text{Tokenomics} \times M_T) + (\text{Security} \times M_S) + (\text{Team} \times M_{\text{Tm}}) + (\text{Community} \times M_C)$$

Where each dimension multiplier $M_i = \text{Weight}_i \times 10$. Multipliers are not a single universal split; they vary deterministically based on protocol category to reflect domain-specific risk exposure.

### Deterministic Category Dimension Weight Matrix
All weights are category-specific and deterministically fixed per protocol category, sourced from `getCategoryDimensionWeights()` in `src/services/EvaluationBlueprint.ts`:

| Protocol Category | Utility | Tokenomics | Security | Team | Community | Weight Set | Key Architectural Focus |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **DeFi Protocol (AMM / Lending)** | 25% (×2.5) | 20% (×2.0) | 35% (×3.5) | 10% (×1.0) | 10% (×1.0) | **25/20/35/10/10** | Smart contract & invariant security prioritized |
| **Layer 1 Blockchain** | 25% (×2.5) | 20% (×2.0) | 30% (×3.0) | 10% (×1.0) | 15% (×1.5) | **25/20/30/10/15** | Node decentralization, throughput & ecosystem |
| **Restaking / Shared Security / AVS** | 25% (×2.5) | 15% (×1.5) | 35% (×3.5) | 15% (×1.5) | 10% (×1.0) | **25/15/35/15/10** | Slashing risks, operator security & collateral |
| **Privacy / Cryptographic (FHE / ZK / MPC)** | 25% (×2.5) | 10% (×1.0) | 35% (×3.5) | 20% (×2.0) | 10% (×1.0) | **25/10/35/20/10** | Cryptographic proof validity & core team rigor |
| **Layer 2 / Scaling** | 25% (×2.5) | 15% (×1.5) | 35% (×3.5) | 10% (×1.0) | 15% (×1.5) | **25/15/35/10/15** | Sequencer decentralization & bridge proofs |
| **Infrastructure (Oracle / Bridge)** | 25% (×2.5) | 15% (×1.5) | 35% (×3.5) | 15% (×1.5) | 10% (×1.0) | **25/15/35/15/10** | Data latency, consensus & bridge verification |
| **RWA (Tokenization / TradFi Bridge)** | 25% (×2.5) | 20% (×2.0) | 35% (×3.5) | 10% (×1.0) | 10% (×1.0) | **25/20/35/10/10** | Legal custody, asset backing & contract safety |
| **DePIN (Compute / Storage / Wireless)** | 30% (×3.0) | 20% (×2.0) | 25% (×2.5) | 15% (×1.5) | 10% (×1.0) | **30/20/25/15/10** | Hardware network density & real physical utility |
| **Memecoin / Speculative** | 10% (×1.0) | 30% (×3.0) | 20% (×2.0) | 10% (×1.0) | 30% (×3.0) | **10/30/20/10/30** | Distribution fairness, liquidity sinks & social |
| **Specialized / Experimental (Default)** | 25% (×2.5) | 25% (×2.5) | 25% (×2.5) | 15% (×1.5) | 10% (×1.0) | **25/25/25/15/10** | Balanced baseline evaluation for novel designs |

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

### Module 4: AVF-04 — Scenario Readiness & Stress-Input Verification
- **Purpose:** AVF-04 verifies scenario readiness and lifecycle state for stress-test inputs (TVL, live price, contract address) and tracks F1/F2 convergence-loop execution. Full numerical price-shock, liquidity-drain and slippage simulations are not currently attached.
- **Output:** Status returns neutral verification indicators: `PASSED`, `PARTIALLY_EXECUTED`, `UNEXECUTED` / `NARRATIVE_ONLY`, or `INPUT_MISSING`.

### Module 5: AVF-05 — Score Arithmetic & Weight Verification
- **Purpose:** Recomputes the weighted composite score to double precision:
  $$\text{Recomputed} = ((U \times W_u) + (T \times W_t) + (S \times W_s) + (Tm \times W_{tm}) + (C \times W_c)) \times 10$$
- **Discrepancy Threshold:** Must be $\le 0.5\text{ pts}$ to receive `VERIFIED`.

### Module 6: AVF-06 — Risk-Conclusion Semantic Consistency
- **Purpose:** Verifies whether the declared official risk classification (`Low Risk`, `Medium Risk`, `Declared Risk`) is supported by independent evidence and verified security telemetry (GoPlus, RugCheck, bytecode invariants, threat vector checks).
- **Evidence-Consistency Role:** AVF-06 is strictly an evidence-consistency check. It verifies whether the official declared risk classification is supported by independent evidence and security telemetry. It does not derive, replace, or automatically assign the official classification from the numerical Evaluation Score. It does not silently create a replacement rating or risk-tier system.
- **Decoupled Architecture:** The official risk classification, numerical Evaluation Score (/100), evidence status, risk findings, risk severity, and executed verification versus descriptive capability are separate, decoupled outputs.
- **Output:** `CONSISTENT` (0 contradictions; declared risk supported by evidence), `REQUIRES_REVIEW` (insufficient evidence or elevated telemetry findings requiring auditor review), or `CONFLICT` (critical contradiction between declared classification and detected exploit vectors).

### Module 7: AVF-07 — Deterministic Multi-Source Confidence
- **Purpose:** Computes composite statistical confidence across underlying modules.
- **Formula:** See Section 4 for the exact mathematical formula.

### Module 8: AVF-08 — Traceability & Cryptographic Integrity
- **Purpose:** Guarantees cryptographic report traceability and data integrity.
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
   - Direct execution rate from AVF-04 scenario execution / readiness rate (`avf04.scenarioExecutionRate`, 0.0 to 1.0).
4. **$C_{\text{risk}}$ (Semantic Consistency Confidence — 20%):**
   - `1.0` (100%) when AVF-06 status is `CONSISTENT`.
   - `0.60` (60%) when AVF-06 status is `REQUIRES_REVIEW`.
   - `0.20` (20%) when AVF-06 status is `CONFLICT`.
   - `0.0` when input signals are missing.

### Confidence Thresholds:
- **HIGH:** $\ge 85\%$ (0.85) — Verified evidence grounding ready for final audit reporting.
- **MODERATE:** $70\% - 84\%$ — Partial telemetry present; narrative verification noted.
- **LOW / CAUTION:** $< 70\%$ — Requires additional source telemetry.

---

## 5. AVF-08 Cryptographic Integrity & Signing Requirements

AVF-08 ensures complete cryptographic audit trail traceability and immutability:

### Canonical Digest Generation (SHA-256):
Every report generates a canonical SHA-256 hash payload composed of:
$$\text{Payload} = \text{SHA256}(\text{Scores} \parallel \text{Verdict} \parallel \text{CreatedAt})$$

### Signing Requirements:
1. **System Draft State:**
   - When a draft is newly generated before human audit completion, status is `UNSIGNED`.
   - The report displays the calculated digest with "Pending Final Sign-Off" status.
2. **Auditor Final Delivery State:**
   - The lead auditor inspects the draft, applies notes, and executes cryptographic signing.
   - Generates an Ed25519 digital signature (`auditSignature.signatureHash`).
   - AVF-08 verifies signature authenticity, timestamp integrity, and public key fingerprint, transitioning status to `VERIFIED` / `HASH_MATCH`.

---

## 6. Evaluation Taxonomies & Decoupled Metrics Framework

Crypto Review Lab enforces strict separation between distinct evaluation layers:

1. **Official Risk Classification (`riskLevel`):**
   Authoritative protocol risk tiers: `Low Risk`, `Medium Risk`, and `Declared Risk`. These categorical levels represent the overarching risk designation.

2. **Numerical Evaluation Score (`score`):**
   A continuous composite rating on a 0–100 scale computed via category-weighted dimensions (Utility, Tokenomics, Security, Team, Community).

3. **Evidence Status:**
   Granular provenance tracking for each individual data signal: `VERIFIED` (demonstrably executed on live data), `UNVERIFIED` (pending corroboration), `STANDBY` (awaiting input), `NOT_PERFORMED` (simulation or scan not executed), and `NARRATIVE_ONLY` (heuristic or literature bound).

4. **Risk Findings:**
   Itemized, specific technical observations (e.g., unrenounced mint authority, active fee switch, multisig quorum configuration, lack of public audits).

5. **Risk Severity:**
   Standardized four-tier severity classification: `Low`, `Medium`, `High`, and `Critical`.

6. **Executed Verification vs. Descriptive Capability:**
   Explicitly distinguishes operations algorithmically executed and confirmed against active on-chain data from conceptual rubric descriptions, static provider heuristics, or planned audit features. No operation is displayed as `VERIFIED` or `PASSED` unless the corresponding check actually ran and yielded verifiable evidence.
3. **Immutability Protection:**
   - Any modification to dimension scores or verdict text invalidates the digital signature hash immediately (`HASH_MISMATCH` / `SIGNATURE_INVALID`).
