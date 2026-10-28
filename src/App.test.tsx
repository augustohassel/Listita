import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import App from './App'
import { db } from './db'

afterEach(() => vi.unstubAllGlobals())

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

it('permite crear un listado en modal, anotar elementos, destacar podio en rankings y persistir entre sesiones', async () => {
  const app = render(<App />)
  await screen.findByText('Vinos, bares, comidas… empezá por un listado.')

  fireEvent.click(screen.getByRole('button', { name: /Nuevo listado/i }))
  const listDialog = await screen.findByRole('dialog', { name: 'Nuevo listado' })
  fill('Nombre del listado', 'Mis vinos')
  fill('Categoría', 'Vinos')
  fill('Atributos del listado', 'Bodega')
  fireEvent.click(within(listDialog).getByRole('button', { name: '+ Chip' }))
  fill('Atributos del listado', 'Cepa')
  fireEvent.click(within(listDialog).getByRole('button', { name: 'Crear listado' }))

  await screen.findByRole('heading', { name: 'Mis vinos' })

  fireEvent.click(screen.getByRole('button', { name: /Nuevo elemento/i }))
  const itemDialog = await screen.findByRole('dialog', { name: 'Agregar elemento' })
  fill('Nombre del elemento', 'Malbec')
  fill('Bodega', 'Mendoza')
  fill('Cepa', 'Malbec')
  fill('Notas y particularidades', 'Frutado y suave')
  fireEvent.click(within(itemDialog).getByRole('button', { name: 'Agregar elemento' }))
  await screen.findByRole('heading', { name: 'Malbec' })
  expect(screen.getByText('Mendoza')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /Nuevo elemento/i }))
  const secondDialog = await screen.findByRole('dialog', { name: 'Agregar elemento' })
  fill('Nombre del elemento', 'Merlot')
  fireEvent.click(within(secondDialog).getByRole('button', { name: 'Agregar elemento' }))
  await screen.findByRole('heading', { name: 'Merlot' })

  fireEvent.click(screen.getByRole('button', { name: 'Editar Malbec' }))
  const editDialog = await screen.findByRole('dialog', { name: 'Editar elemento' })
  fill('Notas y particularidades', 'Ideal para pastas')
  fireEvent.click(within(editDialog).getByRole('button', { name: 'Guardar cambios' }))
  await screen.findByText('Ideal para pastas')

  const nav = screen.getByRole('navigation', { name: 'Navegación principal' })
  fireEvent.click(within(nav).getByRole('button', { name: /Rankings/i }))

  fireEvent.click(screen.getByRole('button', { name: /Nuevo ranking/i }))
  const rankingDialog = await screen.findByRole('dialog', { name: 'Crear nuevo ranking' })
  fill('Nombre del ranking', 'Para volver')
  fireEvent.click(within(rankingDialog).getByRole('button', { name: 'Crear ranking' }))

  const ranking = await screen.findByRole('article', { name: 'Para volver' })
  expect(within(ranking).getByText('#1 Oro')).toBeInTheDocument()
  expect(within(ranking).getByText('#2 Plata')).toBeInTheDocument()

  fireEvent.click(within(ranking).getByRole('button', { name: 'Subir Merlot' }))
  await waitFor(() => expect(within(ranking).getAllByRole('listitem')[0]).toHaveTextContent('Merlot'))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Subir Merlot' })).toBeDisabled())

  app.unmount()
  db.close()
  await db.open()
  render(<App />)

  const restoredNav = await screen.findByRole('navigation', { name: 'Navegación principal' })
  fireEvent.click(within(restoredNav).getByRole('button', { name: /Rankings/i }))
  const restored = await screen.findByRole('article', { name: 'Para volver' })
  expect(within(restored).getAllByRole('listitem')[0]).toHaveTextContent('Merlot')

  fireEvent.click(within(restored).getByRole('button', { name: 'Quitar Merlot del ranking' }))
  await waitFor(() => expect(within(restored).getAllByRole('listitem')).toHaveLength(1))
  const merlotOption = within(restored).getByRole('option', { name: 'Merlot' }) as HTMLOptionElement
  fireEvent.change(within(restored).getByLabelText('Agregar al ranking'), {
    target: { value: merlotOption.value },
  })
  await waitFor(() => expect(within(restored).getAllByRole('listitem')).toHaveLength(2))

  fireEvent.click(within(restoredNav).getByRole('button', { name: /Elementos/i }))
  await screen.findByText('Ideal para pastas')

  fireEvent.click(screen.getByRole('button', { name: 'Eliminar Malbec' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar eliminar Malbec' }))
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Malbec' })).not.toBeInTheDocument())

  fireEvent.click(screen.getByRole('button', { name: /Eliminar listado/i }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar eliminación' }))
  await screen.findByText('No hay un listado seleccionado')
  expect(await db.items.count()).toBe(0)
  expect(await db.rankings.count()).toBe(0)
})

it('muestra errores de validación en el modal sin perder lo escrito', async () => {
  render(<App />)
  await screen.findByText('Vinos, bares, comidas… empezá por un listado.')

  fireEvent.click(screen.getByRole('button', { name: /Nuevo listado/i }))
  fill('Nombre del listado', 'Vinos')
  fill('Atributos del listado', 'Cepa, cepa')
  fireEvent.click(screen.getByRole('button', { name: 'Crear listado' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('atributos distintos')
  expect(screen.getByLabelText('Nombre del listado')).toHaveValue('Vinos')
  expect(await db.lists.count()).toBe(0)
})

it('permite cargar datos demo, rechaza backups corruptos en Ajustes sin alterar la base y permite vaciarla', async () => {
  render(<App />)
  const nav = await screen.findByRole('navigation', { name: 'Navegación principal' })
  fireEvent.click(within(nav).getByRole('button', { name: /Ajustes/i }))

  const settingsSection = screen.getByRole('region', { name: 'Ajustes y datos locales' })
  expect(settingsSection).toHaveTextContent(/Listita\s+v\d+\.\d+\.\d+\s+•\s+PWA Local/)

  fireEvent.click(screen.getByRole('button', { name: /Cargar datos de demostración/i }))
  await waitFor(async () => expect(await db.lists.count()).toBeGreaterThanOrEqual(2))
  const initialCount = await db.lists.count()

  const fileInput = screen.getByLabelText('Importar archivo de backup JSON')
  const corruptFile = new File(['{json-invalido'], 'corrupt.json', { type: 'application/json' })
  fireEvent.change(fileInput, { target: { files: [corruptFile] } })

  expect(await screen.findByRole('alert')).toHaveTextContent(/corrupto|inválido/i)
  expect(await db.lists.count()).toBe(initialCount)

  fireEvent.click(screen.getByRole('button', { name: /Borrar todos los datos/i }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar borrado total' }))
  await waitFor(async () => expect(await db.lists.count()).toBe(0))
})

it('gestiona el subtítulo contextual en el Header y permite alternar la apariencia (claro/oscuro)', async () => {
  render(<App />)
  const nav = await screen.findByRole('navigation', { name: 'Navegación principal' })

  // Cargar datos demo
  fireEvent.click(within(nav).getByRole('button', { name: /Ajustes/i }))
  fireEvent.click(screen.getByRole('button', { name: /Cargar datos de demostración/i }))
  await waitFor(async () => expect(await db.lists.count()).toBeGreaterThan(0))

  // En Ajustes el Header NO muestra subtítulo del primer listado
  const header = screen.getByRole('banner')
  expect(within(header).queryByText(/·/)).not.toBeInTheDocument()

  // En Mis listados tampoco muestra subtítulo de un listado
  fireEvent.click(within(nav).getByRole('button', { name: /Listados/i }))
  expect(within(header).queryByText(/·/)).not.toBeInTheDocument()

  // En Elementos SÍ muestra el subtítulo del listado seleccionado
  fireEvent.click(within(nav).getByRole('button', { name: /Elementos/i }))
  await waitFor(() => expect(within(header).getByText(/·/)).toBeInTheDocument())

  // Toggle directo desde el Header
  const themeToggleButton = screen.getByRole('button', { name: /Cambiar a modo (claro|oscuro)/i })
  fireEvent.click(themeToggleButton)
  // Al alternar cambia de estado
  const currentTheme = localStorage.getItem('listita_theme')
  expect(['light', 'dark']).toContain(currentTheme)

  // Selector de apariencia en Ajustes
  fireEvent.click(within(nav).getByRole('button', { name: /Ajustes/i }))
  fireEvent.click(screen.getByRole('button', { name: 'Oscuro' }))
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  expect(localStorage.getItem('listita_theme')).toBe('dark')

  fireEvent.click(screen.getByRole('button', { name: 'Claro' }))
  expect(document.documentElement.classList.contains('dark')).toBe(false)
  expect(localStorage.getItem('listita_theme')).toBe('light')

  // Limpiar para siguientes tests
  fireEvent.click(screen.getByRole('button', { name: /Borrar todos los datos/i }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar borrado total' }))
  await waitFor(async () => expect(await db.lists.count()).toBe(0))
})
