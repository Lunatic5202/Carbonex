# Dependency license metadata audit

**Snapshot reviewed:** `frontend/package-lock.json` and `frontend/coal-mine-gis/package-lock.json`  
**Scope:** npm package metadata recorded in both committed lockfiles; this is not a legal opinion or a complete asset-rights review.

## Inventory

| Lockfile | Package entries | Missing license fields |
|---|---:|---:|
| `frontend/package-lock.json` | 90 | 0 |
| `frontend/coal-mine-gis/package-lock.json` | 155 | 1 |

### Items requiring review

- `leaflet.heat` (version 0.2.0) has no license field in either lockfile.
- `react-leaflet` and `@react-leaflet/core` in the GIS frontend declare `Hippocratic-2.1`. Review the exact terms and intended use before distribution.
- `gsap` (version 3.15.0) is recorded with a GSAP standard “no charge” license URL rather than a conventional open-source SPDX identifier. Review the current GSAP terms for the planned use and distribution.
- The main frontend lockfile records MPL-2.0 for Lightning CSS packages. Preserve and review the applicable notices and source-disclosure obligations where relevant.

## Python and firmware dependencies

The repository also contains Python requirements and PlatformIO firmware dependencies. They are not covered by the npm lockfile counts above. Their resolved transitive versions and license obligations remain unverified.

## Follow-up

1. Verify the license for `leaflet.heat` from its authoritative source.
2. Review Hippocratic-2.1 and GSAP terms for the intended deployment and commercial context.
3. Generate resolved Python and PlatformIO dependency inventories.
4. Review GIS datasets, maps, icons, firmware libraries, and other assets independently.
5. Regenerate this report whenever either npm lockfile changes.

**Limitations:** package-lock metadata can be absent, stale, or simplified. Counts include optional and platform-specific package entries. This report does not replace actual license texts or notices.
