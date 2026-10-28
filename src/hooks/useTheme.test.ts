import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useTheme,
  readStoredTheme,
  writeStoredTheme,
  applyThemeToDom,
  THEME_STORAGE_KEY,
  DARK_THEME_COLOR,
  LIGHT_THEME_COLOR,
} from './useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
    document.head.innerHTML = '<meta name="theme-color" content="#000000" />'
  })

  it('inicia por defecto en modo oscuro si no hay valor previo guardado', () => {
    expect(readStoredTheme()).toBe('dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('recupera valor guardado en localStorage', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    expect(readStoredTheme()).toBe('light')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('ignora valores invalidos en localStorage y cae en dark por defecto', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'invalid-value')
    expect(readStoredTheme()).toBe('dark')
  })

  it('permite alternar el tema con toggleTheme', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')

    act(() => {
      result.current.toggleTheme()
    })
    expect(result.current.theme).toBe('light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    act(() => {
      result.current.toggleTheme()
    })
    expect(result.current.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('permite establecer explícitamente el tema con setTheme', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('light')
    })
    expect(result.current.theme).toBe('light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')

    act(() => {
      result.current.setTheme('dark')
    })
    expect(result.current.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('actualiza el atributo content de meta[name="theme-color"] al cambiar tema', () => {
    applyThemeToDom('light')
    const meta = document.querySelector('meta[name="theme-color"]')
    expect(meta?.getAttribute('content')).toBe(LIGHT_THEME_COLOR)

    applyThemeToDom('dark')
    expect(meta?.getAttribute('content')).toBe(DARK_THEME_COLOR)
  })

  it('tolera fallos de escritura en localStorage sin romper la ejecución', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(() => writeStoredTheme('light')).not.toThrow()
    setItemSpy.mockRestore()
  })
})
