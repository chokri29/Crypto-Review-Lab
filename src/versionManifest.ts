/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Authoritative Crypto Review Lab & AVF Version Manifest
 * Single source of truth for all framework, engine, blueprint, and ruleset versions.
 */

export interface VersionManifest {
  crlFrameworkVersion: string;
  avfVersion: string;
  f3EngineVersion: string;
  blueprintVersion: string;
  ruleSetVersion: string;
  combinedVersionString: string;
  releasedAt: string;
}

export const CRL_VERSION_MANIFEST: VersionManifest = {
  crlFrameworkVersion: 'CRL-v3.2',
  avfVersion: 'AVF-v3.2',
  f3EngineVersion: 'F3-ENGINE-v3.2',
  blueprintVersion: 'Evaluation Blueprint v2.4',
  ruleSetVersion: 'CRL-RULESET-v3.2',
  combinedVersionString: 'AVF-F3-v3.2 (Blueprint v2.4)',
  releasedAt: '2026-03-01T00:00:00Z',
} as const;

export function getVersionManifest(): VersionManifest {
  return CRL_VERSION_MANIFEST;
}
