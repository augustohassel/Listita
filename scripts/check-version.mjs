import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/

/** Parsea una versión SemVer estricta `MAJOR.MINOR.PATCH` a `[major, minor, patch]`. */
export function parseSemver(version) {
  if (typeof version !== 'string') return null
  const match = SEMVER_RE.exec(version)
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

/** Compara dos tuplas SemVer `[major, minor, patch]`. */
export function compareSemver(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i]
  }
  return 0
}

/** Devuelve el mayor tag `vX.Y.Z` encontrado en la lista de tags. */
export function getHighestSemverTag(tags) {
  let highest = null
  for (const rawTag of tags) {
    const tag = rawTag.trim()
    if (!tag.startsWith('v')) continue
    const parts = parseSemver(tag.slice(1))
    if (!parts) continue
    if (!highest || compareSemver(parts, highest.parts) > 0) {
      highest = {
        tag,
        version: `${parts[0]}.${parts[1]}.${parts[2]}`,
        parts,
      }
    }
  }
  return highest
}

/**
 * Valida que `package.json` y `package-lock.json` mantengan una versión SemVer estricta
 * y que, al promocionar a `master`, sea mayor al último tag `vX.Y.Z` (salvo re-ejecución
 * sobre el mismo commit cuando `allowSameCommit` está activo).
 */
export function validateReleaseVersion({
  pkgVersion,
  lockVersion,
  lockRootVersion,
  tags = [],
  targetTagCommit = null,
  headCommit = null,
  requireBump = false,
  allowSameCommit = false,
}) {
  const pkgParts = parseSemver(pkgVersion)
  if (!pkgParts) {
    return {
      ok: false,
      error: `Versión inválida en package.json: "${pkgVersion}". Debe respetar SemVer estricto MAJOR.MINOR.PATCH (ej. 0.2.1, 0.3.0, 1.0.0).`,
    }
  }

  if (lockVersion !== undefined && lockVersion !== pkgVersion) {
    return {
      ok: false,
      error: `Desfase entre package.json ("${pkgVersion}") y package-lock.json ("${lockVersion}"). Usá "npm version <patch|minor|major> --no-git-tag-version".`,
    }
  }

  if (lockRootVersion !== undefined && lockRootVersion !== pkgVersion) {
    return {
      ok: false,
      error: `Desfase entre package.json ("${pkgVersion}") y packages[""].version en package-lock.json ("${lockRootVersion}").`,
    }
  }

  const tag = `v${pkgVersion}`
  if (!requireBump) {
    return { ok: true, tag, version: pkgVersion, alreadyReleased: false }
  }

  if (tags.includes(tag)) {
    if (allowSameCommit && targetTagCommit && headCommit && targetTagCommit === headCommit) {
      return { ok: true, tag, version: pkgVersion, alreadyReleased: true }
    }
    return {
      ok: false,
      error: `El tag ${tag} ya existe en el repositorio. Incrementá la versión antes de promocionar a master con: npm version <patch|minor|major> --no-git-tag-version`,
    }
  }

  const highest = getHighestSemverTag(tags)
  if (highest && compareSemver(pkgParts, highest.parts) <= 0) {
    return {
      ok: false,
      error: `La versión en package.json (${pkgVersion}) debe ser estrictamente mayor al último tag SemVer (${highest.tag}). Ejecutá: npm version <patch|minor|major> --no-git-tag-version`,
    }
  }

  return { ok: true, tag, version: pkgVersion, alreadyReleased: false }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

function resolveTagCommit(tag) {
  try {
    return git(['rev-parse', '-q', '--verify', `refs/tags/${tag}^{commit}`])
  } catch {
    return null
  }
}

function main() {
  const allowedArgs = new Set(['--require-bump', '--allow-same-commit'])
  const rawArgs = process.argv.slice(2)
  const unknownArgs = rawArgs.filter((arg) => !allowedArgs.has(arg))
  if (unknownArgs.length > 0) {
    console.error(`Argumento(s) no reconocido(s): ${unknownArgs.join(', ')}`)
    process.exit(1)
  }

  const args = new Set(rawArgs)
  const requireBump = args.has('--require-bump')
  const allowSameCommit = args.has('--allow-same-commit')

  const pkg = readJson(resolve('package.json'))
  const lockPath = resolve('package-lock.json')
  const lock = existsSync(lockPath) ? readJson(lockPath) : null

  const tagsRaw = requireBump ? git(['tag', '--list']) : ''
  const tags = tagsRaw ? tagsRaw.split(/\r?\n/).filter(Boolean) : []
  const expectedTag = `v${pkg.version}`
  const targetTagCommit = requireBump && tags.includes(expectedTag) ? resolveTagCommit(expectedTag) : null
  const headCommit = requireBump ? process.env.GITHUB_SHA || git(['rev-parse', 'HEAD']) : null

  const result = validateReleaseVersion({
    pkgVersion: pkg.version,
    lockVersion: lock?.version,
    lockRootVersion: lock?.packages?.['']?.version,
    tags,
    targetTagCommit,
    headCommit,
    requireBump,
    allowSameCommit,
  })

  if (!result.ok) {
    console.error(`Error SemVer: ${result.error}`)
    process.exit(1)
  }

  if (result.alreadyReleased) {
    console.log(`SemVer OK: ${result.tag} ya apunta al commit actual (${headCommit.slice(0, 7)}).`)
  } else {
    console.log(`SemVer OK: ${result.tag}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main()
}
