import { describe, expect, it } from 'vitest'
import {
  compareSemver,
  getHighestSemverTag,
  parseSemver,
  validateReleaseVersion,
} from './check-version.mjs'

describe('check-version SemVer', () => {
  it('parsea SemVer estricto y rechaza formatos inválidos, espacios o sufijos', () => {
    expect(parseSemver('0.2.0')).toEqual([0, 2, 0])
    expect(parseSemver('1.10.25')).toEqual([1, 10, 25])
    expect(parseSemver('v0.2.0')).toBeNull()
    expect(parseSemver(' 0.2.0 ')).toBeNull()
    expect(parseSemver('0.2.0-alpha.1')).toBeNull()
    expect(parseSemver('0.2.0+1')).toBeNull()
    expect(parseSemver('0.2.0.1')).toBeNull()
    expect(parseSemver('01.2.0')).toBeNull()
    expect(parseSemver('0.2')).toBeNull()
  })

  it('compara numéricamente major, minor y patch respetando decenas', () => {
    expect(compareSemver([0, 10, 0], [0, 2, 0])).toBeGreaterThan(0)
    expect(compareSemver([1, 0, 0], [0, 99, 99])).toBeGreaterThan(0)
    expect(compareSemver([0, 2, 1], [0, 2, 0])).toBeGreaterThan(0)
    expect(compareSemver([0, 2, 0], [0, 2, 0])).toBe(0)
    expect(compareSemver([0, 2, 0], [0, 3, 0])).toBeLessThan(0)
  })

  it('obtiene el mayor tag SemVer ignorando tags con sufijos no estándar', () => {
    const highest = getHighestSemverTag(['v0.1.0', 'v0.2.0.1', 'v0.10.0', 'v0.2.0'])
    expect(highest).toEqual({
      tag: 'v0.10.0',
      version: '0.10.0',
      parts: [0, 10, 0],
    })
  })

  it('valida incrementos de patch, minor y major respecto al último tag', () => {
    const tags = ['v0.1.0', 'v0.2.0']
    expect(
      validateReleaseVersion({
        pkgVersion: '0.2.1',
        lockVersion: '0.2.1',
        lockRootVersion: '0.2.1',
        tags,
        requireBump: true,
      }),
    ).toEqual({ ok: true, tag: 'v0.2.1', version: '0.2.1', alreadyReleased: false })

    expect(
      validateReleaseVersion({
        pkgVersion: '0.3.0',
        lockVersion: '0.3.0',
        lockRootVersion: '0.3.0',
        tags,
        requireBump: true,
      }),
    ).toEqual({ ok: true, tag: 'v0.3.0', version: '0.3.0', alreadyReleased: false })

    expect(
      validateReleaseVersion({
        pkgVersion: '1.0.0',
        lockVersion: '1.0.0',
        lockRootVersion: '1.0.0',
        tags,
        requireBump: true,
      }),
    ).toEqual({ ok: true, tag: 'v1.0.0', version: '1.0.0', alreadyReleased: false })
  })

  it('falla cuando se olvida bumpear o la versión retrocede en master/PR', () => {
    const tags = ['v0.1.0', 'v0.2.0']

    const repeated = validateReleaseVersion({
      pkgVersion: '0.2.0',
      lockVersion: '0.2.0',
      lockRootVersion: '0.2.0',
      tags,
      targetTagCommit: 'abc123',
      headCommit: 'def456',
      requireBump: true,
      allowSameCommit: true,
    })
    expect(repeated.ok).toBe(false)

    const downgraded = validateReleaseVersion({
      pkgVersion: '0.1.5',
      lockVersion: '0.1.5',
      lockRootVersion: '0.1.5',
      tags,
      requireBump: true,
    })
    expect(downgraded.ok).toBe(false)
  })

  it('permite re-ejecución idempotente en master cuando el tag ya apunta al mismo commit', () => {
    const res = validateReleaseVersion({
      pkgVersion: '0.2.0',
      lockVersion: '0.2.0',
      lockRootVersion: '0.2.0',
      tags: ['v0.1.0', 'v0.2.0'],
      targetTagCommit: 'abc123',
      headCommit: 'abc123',
      requireBump: true,
      allowSameCommit: true,
    })
    expect(res).toEqual({ ok: true, tag: 'v0.2.0', version: '0.2.0', alreadyReleased: true })
  })

  it('rechaza tag existente en PR aunque apunte al mismo commit cuando allowSameCommit es false', () => {
    const res = validateReleaseVersion({
      pkgVersion: '0.2.0',
      lockVersion: '0.2.0',
      lockRootVersion: '0.2.0',
      tags: ['v0.1.0', 'v0.2.0'],
      targetTagCommit: 'abc123',
      headCommit: 'abc123',
      requireBump: true,
      allowSameCommit: false,
    })
    expect(res.ok).toBe(false)
  })

  it('detecta desfase entre package.json y package-lock.json', () => {
    const res = validateReleaseVersion({
      pkgVersion: '0.3.0',
      lockVersion: '0.2.0',
      lockRootVersion: '0.2.0',
      requireBump: false,
    })
    expect(res.ok).toBe(false)

    const rootMismatch = validateReleaseVersion({
      pkgVersion: '0.3.0',
      lockVersion: '0.3.0',
      lockRootVersion: '0.2.0',
      requireBump: false,
    })
    expect(rootMismatch.ok).toBe(false)
  })
})
