# Crypto Review Lab (CRL)

> **Algorithmic Security Intelligence for Digital Assets & Tokenized Equities**  
> Powered by the Algorithmic Verification Framework (AVF) Tripartite Core Engine & Blueprint v2.4.

---

## 📌 Overview

**Crypto Review Lab (CRL)** is an independent cryptocurrency research, security evaluation, and asset verification platform. Designed for decentralized finance (DeFi) protocols, digital asset treasuries, web3 developers, and market participants, CRL delivers rigorous, data-driven security evaluations, real-time telemetry surveillance, and independent transparency across native crypto assets and tokenized real-world equities (xStocks).

All evaluations are governed by the deterministic **Algorithmic Verification Framework (AVF)** and audited through an automated 8-Gate Re-Control pipeline and multi-module deterministic verification layer with deterministic verification with no AI estimation in F3.

---

## ⚙️ Core Architecture: AVF Tripartite Engine

The AVF architecture operates three sequential execution layers to ensure mathematical precision and reproducible auditing:

```
┌────────────────────────────────────────────────────────┐
│  F1 — Candidate Engine (Telemetry & Draft Vectors)     │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│  F2 — Phase Two Re-Control (8-Gate Quality Pipeline)   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│  F3 — Deterministic Verification (8 AVF Rule Modules)  │
└────────────────────────────────────────────────────────┘
```

### 1. F1 — Candidate Engine
Automatically ingests contract bytecode, tokenomics schedules, and multi-node on-chain telemetry (GoPlus, RugCheck, Blockscout, CoinGecko, CoinMarketCap) to generate initial multidimensional evaluation vectors.

### 2. F2 — Phase Two Automated Re-Control Engine
Candidate evaluations are subjected to an 8-Gate automated quality pipeline (Gate 0 through Gate 7) enforcing strict consistency and convergence:

* **Gate 0 — Structural Completeness Check:** Verifies presence of mandatory fields (name, symbol, scores, summary, verdict, pros/cons).
* **Gate 1 — Multi-Source Triangulation:** Cross-verifies market telemetry across CoinGecko, CMC, and related price/volume feeds.
* **Gate 2 — On-Chain Cross-Check:** Verifies on-chain scan cleanliness and contract parameters (open-source bytecode, honeypot risk, mintable supply, blacklist, taxes, concentration, custody, and exploit vectors). When live GoPlus/RugCheck telemetry is present, Gate 2 is evaluated from a neutral baseline of 90 (applying scan adjustments) rather than anchoring to the F1 subjective security dimension; falls back to F1 security score × 10 only if scan telemetry is unavailable. Requires score ≥ 90% and no honeypot detection to pass.
* **Gate 3 — Cross-Framework Consistency Check:** Enforces strict `< 3.0 point` composite score drift convergence between F1 and F2 models.
* **Gate 4 — Tokenomics Re-Verification:** Evaluates token distribution models, circulating vs. max supply ratios, and unlock overhang.
* **Gate 5 — Score Arithmetic Check:** Recomputes category-weighted dimension math to ensure exact mathematical consistency without drift.
* **Gate 6 — Risk Level Evidence Check:** Verifies that a declared "Low / Low Risk" classification is not contradicted by critical honeypot or cannot-sell-all telemetry.
* **Gate 7 — Formatting Integrity:** Checks presence of core narrative sections (via keyword), pros/cons balance (≥3 each), and verdict length.

### 3. F3 — Deterministic Verification Layer
Executes 8 automated verification modules with **strictly zero AI / LLM estimation**:

1. **AVF-01 (Classification & Taxonomy):** Validates protocol taxonomy against CoinGecko and DEX market categories.
2. **AVF-02 (Evidence & Provenance Traceability):** Verifies public documentation links, official block explorer registries, and security feeds.
3. **AVF-03 (Methodology & Weighting Compliance):** Verifies that weights are category-specific and deterministically fixed per protocol category (not a single universal split), sourced from `getCategoryDimensionWeights()` in `EvaluationBlueprint.ts`, and applied without ad-hoc parameter tampering.
4. **AVF-04 (Scenario Readiness & Stress-Input Verification):** Tracks scenario readiness and lifecycle state for stress-test inputs (TVL, live price, contract address) and F1/F2 convergence.
5. **AVF-05 (Score Arithmetic & Zero-Drift Verification):** Algorithmically recomputes weighted averages and confirms aggregation math within a strict `±0.5 point` tolerance.
6. **AVF-06 (Semantic Risk Consistency Check):** Verifies whether the declared official risk classification is supported by independent evidence and security telemetry; decoupled from numerical score calculation.
7. **AVF-07 (Calibrated Data Confidence Scoring):** Deterministic confidence calculation across verified on-chain addresses, public audits, and telemetry depth (HIGH ≥85%, MODERATE 70–84%, LOW <70%).
8. **AVF-08 (Cryptographic Provenance & Attestation):** Normalizes canonical audit payloads, computes SHA-256 digests, and validates Ed25519 digital signatures.

---

## 📊 100-Point Master Scoring Formula & Category Weight Matrix

### Linear Weight Formulation
A project's numerical score is calculated across 5 core dimensions (evaluated on a 1.0 to 10.0 scale):

$$\text{Score (100)} = (\text{Utility} \times M_U) + (\text{Tokenomics} \times M_T) + (\text{Security} \times M_S) + (\text{Team} \times M_{\text{Tm}}) + (\text{Community} \times M_C)$$

Where each multiplier $M_i = \text{Weight}_i \times 10$. Multipliers are **not** a single fixed split; they vary deterministically by protocol category.

### Deterministic Category Dimension Weights
Weights are category-specific (not a single fixed split) and sourced from `getCategoryDimensionWeights()` in `EvaluationBlueprint.ts`. Examples:
- DeFi: 25/20/35/10/10 (Security emphasized)
- Layer 1: 25/20/30/10/15
- Default / Specialized: 25/25/25/15/10

Full matrix by protocol category is in ARCHITECTURE.md and the Technical Whitepaper.

---

## 🛡️ The Fundamental Decoupling Principle

CRL enforces an absolute separation between **Numerical Evaluative Scores (/100)** and **Assessed Risk Severity Classifications**:

* **Evaluative Scores (/100):** Measure market-product utility, network adoption, token design, and developer velocity. A high adoption protocol can legitimately achieve a score of 85/100.
* **Risk Severity (`Low Risk`, `Medium Risk`, `Declared Risk` / `Critical`):** Evaluates empirical capital vulnerability. If automated security telemetry detects unverified delegatecalls, centralized mint functions, or treasury custody concentration, the protocol is assigned an overriding **HIGH** or **CRITICAL** risk classification.
* **AVF-06 Verification:** Confirms that a declared low risk rating is corroborated by evidence. It does not overwrite the official classification from the numerical score.

---

## 📑 Technical Whitepaper & Cryptographic Attestation

* **Official 6-Page Technical Whitepaper PDF:** Fully comprehensive, authoritative documentation detailing the 5-Dimension Master Scoring Rubric, the Category Weight Matrix, the 8-Gate Re-Control pipeline, the AVF Tripartite Core (F1/F2/F3), and all 8 Verification Modules. Can be exported directly via the platform UI.
* **Audit Dossier PDF:** Exportable comprehensive asset review reports complete with SHA-256 canonical hashing and Ed25519 digital cryptographic signatures for cryptographic provenance (SHA-256 + Ed25519).

---

## 📈 Verification & Integrity Panel (Tokenized Stocks / xStocks)

A dedicated surveillance engine designed for tokenized equities (such as Backed Finance collateralized tracker certificates on Solana and EVM):

* **Market-Price Consistency:** Cross-corroborates token market prices across independent aggregators (CoinGecko and CoinMarketCap) to ensure pricing consensus across decentralized liquidity pools.
* **Underlying-Equity Tracking:** Tracks tokenized stock spot prices against real-world equity markets using Finnhub market data feeds to measure tracking parity and detect pricing divergences.
* **On-Chain Security & Authority:** Continuously scans token mint authorities, freeze controls, and contract ownership structures for centralized control risks.
* **Deterministic Provenance Matrix:** Key-level data provenance tracking (Source vs. Derived data, provider timestamps, freshness status, and verification status).
* **Live Market Hours Engine:** Tracks real-time NYSE/NASDAQ market sessions, holidays, pre-market, regular hours, and after-hours trading with dynamic status telemetry.

---

## 🛠️ Technology Stack

* **Frontend:** React 19, Vite 6, TypeScript 5.8, Tailwind CSS v4, Lucide React, Framer Motion
* **Analytics & Visualizations:** Recharts, D3-based charting
* **PDF & Cryptography:** jsPDF, Web Crypto API (Ed25519, SHA-256)
* **Data Sources & Security Providers:** CoinGecko API, CoinMarketCap API, Finnhub Stock API, GoPlus Security, RugCheck, Blockscout
* **Backend:** Node.js, Express proxy routes with server-side secret management

---

## 🚀 Getting Started

### Prerequisites
* Node.js 18.x or higher
* npm or yarn

### Installation & Run
```bash
# Clone repository
git clone https://github.com/chokri29/Crypto-Review-Lab.git
cd Crypto-Review-Lab

# Install dependencies
npm install

# Start local development server
npm run dev

# Run TypeScript checks
npm run lint

# Build for production
npm run build
```

---

## 📄 License & Disclaimer

Crypto Review Lab provides algorithmic verification, market-data synthesis, and technical diagnostics for research and transparency purposes. Nothing in this application constitutes financial or investment advice.
