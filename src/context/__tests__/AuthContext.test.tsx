import { act, renderHook, waitFor } from '@testing-library/react'
import { webcrypto } from 'node:crypto'
import { AuthProvider, useAuthContext } from '../AuthContext'
import { clearAllStorage } from '../../lib/storage'

if (typeof globalThis.crypto === 'undefined') {
  // @ts-expect-error assigning webcrypto to global scope for tests
  globalThis.crypto = webcrypto as unknown as Crypto
}

describe('AuthContext credential updates', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>

  beforeEach(() => {
    clearAllStorage()
  })

  it('updates username after verifying current password', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      const response = await result.current.login({ username: 'athlete', password: 'athlete123' })
      expect(response.success).toBe(true)
    })

    expect(result.current.user?.username).toBe('athlete')

    await act(async () => {
      const response = await result.current.updateUsername({
        currentPassword: 'athlete123',
        newUsername: 'athlete-pro',
      })
      expect(response.success).toBe(true)
    })

    expect(result.current.user?.username).toBe('athlete-pro')
    expect(result.current.users.find((entry) => entry.id === result.current.user?.id)?.username).toBe('athlete-pro')
  })

  it('updates password and allows login with the new credential', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      const response = await result.current.login({ username: 'athlete', password: 'athlete123' })
      expect(response.success).toBe(true)
    })

    await act(async () => {
      const response = await result.current.updatePassword({
        currentPassword: 'athlete123',
        newPassword: 'coachReady9',
      })
      expect(response.success).toBe(true)
    })

    expect(result.current.user?.passwordHash).not.toBe('')

    act(() => {
      result.current.logout()
    })

    await act(async () => {
      const response = await result.current.login({ username: 'athlete', password: 'coachReady9' })
      expect(response.success).toBe(true)
    })
  })

  it('updates avatar url in local state', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      const response = await result.current.login({ username: 'athlete', password: 'athlete123' })
      expect(response.success).toBe(true)
    })

    await act(async () => {
      const response = await result.current.updateAvatar({
        avatarUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAEElEQVR42mP8/5+hHgAHggJ/lHkcdQAAAABJRU5ErkJggg==',
      })
      expect(response.success).toBe(true)
    })

    expect(result.current.user?.avatarUrl).toMatch(/^data:image\\/png;base64/)
  })
})
