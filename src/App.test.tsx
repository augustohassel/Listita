import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import App from './App'
import { db } from './db'

afterEach(() => vi.unstubAllGlobals())

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

it('permite crear un listado, anotar elementos y guardar un ranking ordenado entre sesiones', async () => {
  const app = render(<App />)
  await screen.findByText('Vinos, bares, comidas… empezá por un listado.')
  fill('Nombre del listado', 'Mis vinos')
  fill('Categoría', 'Vinos')
  fill('Atributos del listado', 'Bodega, Cepa')
  fireEvent.click(screen.getByRole('button', { name: 'Crear listado' }))

  await screen.findByRole('heading', { name: 'Mis vinos' })
  fill('Nombre del elemento', 'Malbec')
  fill('Bodega', 'Mendoza')
  fill('Cepa', 'Malbec')
  fill('Notas y particularidades', 'Frutado y suave')
  fireEvent.click(screen.getByRole('button', { name: 'Agregar elemento' }))
  await screen.findByRole('heading', { name: 'Malbec' })
  expect(screen.getByText('Mendoza')).toBeInTheDocument()

  await waitFor(() => expect(screen.getByLabelText('Nombre del elemento')).toHaveValue(''))
  fill('Nombre del elemento', 'Merlot')
  fireEvent.click(screen.getByRole('button', { name: 'Agregar elemento' }))
  await screen.findByRole('heading', { name: 'Merlot' })

  fireEvent.click(screen.getByRole('button', { name: 'Editar Malbec' }))
  fill('Notas y particularidades', 'Ideal para pastas')
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  await screen.findByText('Ideal para pastas')

  fill('Nombre del ranking', 'Para volver')
  fireEvent.click(screen.getByRole('button', { name: 'Crear ranking' }))
  const ranking = await screen.findByRole('article', { name: 'Para volver' })
  fireEvent.click(within(ranking).getByRole('button', { name: 'Subir Merlot' }))
  await waitFor(() => expect(within(ranking).getAllByRole('listitem')[0]).toHaveTextContent('Merlot'))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Subir Merlot' })).toBeDisabled())

  app.unmount()
  db.close()
  await db.open()
  render(<App />)
  const restored = await screen.findByRole('article', { name: 'Para volver' })
  expect(within(restored).getAllByRole('listitem')[0]).toHaveTextContent('Merlot')
  expect(screen.getByText('Ideal para pastas')).toBeInTheDocument()

  fireEvent.click(within(restored).getByRole('button', { name: 'Quitar Merlot del ranking' }))
  await waitFor(() => expect(within(restored).getAllByRole('listitem')).toHaveLength(1))
  const merlotOption = within(restored).getByRole('option', { name: 'Merlot' }) as HTMLOptionElement
  fireEvent.change(within(restored).getByLabelText('Agregar al ranking'), { target: { value: merlotOption.value } })
  await waitFor(() => expect(within(restored).getAllByRole('listitem')).toHaveLength(2))

  vi.stubGlobal('confirm', vi.fn(() => true))
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar Malbec' }))
  await waitFor(() => expect(within(restored).getAllByRole('listitem')).toHaveLength(1))
  expect(screen.queryByRole('heading', { name: 'Malbec' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar listado' }))
  await screen.findByText('Vinos, bares, comidas… empezá por un listado.')
  expect(await db.items.count()).toBe(0)
  expect(await db.rankings.count()).toBe(0)
})

it('muestra errores de validación sin perder lo escrito', async () => {
  render(<App />)
  await screen.findByText('Vinos, bares, comidas… empezá por un listado.')
  fill('Nombre del listado', 'Vinos')
  fill('Atributos del listado', 'Cepa, cepa')
  fireEvent.click(screen.getByRole('button', { name: 'Crear listado' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('atributos distintos')
  expect(screen.getByLabelText('Nombre del listado')).toHaveValue('Vinos')
  expect(await db.lists.count()).toBe(0)
})
