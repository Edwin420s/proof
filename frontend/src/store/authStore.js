// Authentication store using Zustand for state management
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      walletAddress: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      session: null,
      
      // Actions
      // Login with wallet
      login: async (walletAddress, userData = {}) => {
        set({ isLoading: true, error: null })
        
        try {
          // In production, this would validate signature
          const user = {
            walletAddress,
            did: `did:polygon:${walletAddress}`,
            profile: {
              name: userData.name || 'Anonymous',
              email: userData.email || null,
              avatar: userData.avatar || null,
              bio: userData.bio || null
            },
            roles: userData.roles || ['user'],
            preferences: userData.preferences || {},
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          }
          
          // Create session
          const session = {
            id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            walletAddress,
            token: `mock-jwt-token-${Date.now()}`,
            issuedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            device: navigator.userAgent,
            ip: '127.0.0.1' // Mock IP
          }
          
          set({
            user,
            walletAddress,
            isAuthenticated: true,
            session,
            isLoading: false,
            error: null
          })
          
          // Track login event
          if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'login', {
              method: 'wallet',
              wallet_address: walletAddress.substring(0, 8) + '...'
            })
          }
          
          return { success: true, user, session }
        } catch (error) {
          console.error('Login error:', error)
          set({ 
            error: error.message || 'Login failed', 
            isLoading: false 
          })
          return { success: false, error: error.message }
        }
      },
      
      // Logout
      logout: () => {
        const { walletAddress } = get()
        
        // Track logout event
        if (typeof window !== 'undefined' && window.gtag && walletAddress) {
          window.gtag('event', 'logout', {
            wallet_address: walletAddress.substring(0, 8) + '...'
          })
        }
        
        set({
          user: null,
          walletAddress: null,
          isAuthenticated: false,
          session: null,
          error: null
        })
        
        // Clear local storage except persist config
        localStorage.removeItem('proof-auth-token')
        localStorage.removeItem('proof-session')
        
        return { success: true }
      },
      
      // Update user profile
      updateProfile: (updates) => {
        const { user } = get()
        
        if (!user) {
          return { success: false, error: 'User not authenticated' }
        }
        
        const updatedUser = {
          ...user,
          profile: {
            ...user.profile,
            ...updates
          },
          updatedAt: new Date().toISOString()
        }
        
        set({ user: updatedUser })
        
        return { success: true, user: updatedUser }
      },
      
      // Update user preferences
      updatePreferences: (preferences) => {
        const { user } = get()
        
        if (!user) {
          return { success: false, error: 'User not authenticated' }
        }
        
        const updatedUser = {
          ...user,
          preferences: {
            ...user.preferences,
            ...preferences
          },
          updatedAt: new Date().toISOString()
        }
        
        set({ user: updatedUser })
        
        return { success: true, user: updatedUser }
      },
      
      // Check if user has role
      hasRole: (role) => {
        const { user } = get()
        return user?.roles?.includes(role) || false
      },
      
      // Check if user is issuer
      isIssuer: () => {
        const { user } = get()
        return user?.roles?.includes('issuer') || false
      },
      
      // Check if user is admin
      isAdmin: () => {
        const { user } = get()
        return user?.roles?.includes('admin') || false
      },
      
      // Refresh session
      refreshSession: () => {
        const { session } = get()
        
        if (!session) {
          return { success: false, error: 'No active session' }
        }
        
        const updatedSession = {
          ...session,
          refreshedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
        
        set({ session: updatedSession })
        
        return { success: true, session: updatedSession }
      },
      
      // Validate session
      validateSession: () => {
        const { session } = get()
        
        if (!session) {
          return { valid: false, reason: 'No session' }
        }
        
        const now = new Date()
        const expiresAt = new Date(session.expiresAt)
        
        if (now > expiresAt) {
          return { valid: false, reason: 'Session expired' }
        }
        
        return { valid: true, session }
      },
      
      // Clear error
      clearError: () => set({ error: null }),
      
      // Set loading state
      setLoading: (isLoading) => set({ isLoading }),
      
      // Mock authentication for demo
      mockLogin: (walletAddress) => {
        const mockUser = {
          walletAddress,
          did: `did:polygon:${walletAddress}`,
          profile: {
            name: 'Demo User',
            email: 'demo@proof.io',
            avatar: null,
            bio: 'Web3 identity enthusiast'
          },
          roles: ['user', 'issuer'],
          preferences: {
            theme: 'light',
            notifications: true,
            language: 'en'
          },
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        }
        
        const mockSession = {
          id: `demo_session_${Date.now()}`,
          walletAddress,
          token: `demo_token_${Date.now()}`,
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          device: 'demo',
          ip: '127.0.0.1'
        }
        
        set({
          user: mockUser,
          walletAddress,
          isAuthenticated: true,
          session: mockSession,
          isLoading: false,
          error: null
        })
        
        return { success: true, user: mockUser, session: mockSession }
      }
    }),
    {
      name: 'proof-auth-store',
      partialize: (state) => ({
        user: state.user,
        walletAddress: state.walletAddress,
        isAuthenticated: state.isAuthenticated,
        session: state.session
      })
    }
  )
)

// Export hooks for easy access
export const useUser = () => useAuthStore(state => state.user)
export const useWalletAddress = () => useAuthStore(state => state.walletAddress)
export const useIsAuthenticated = () => useAuthStore(state => state.isAuthenticated)
export const useIsLoading = () => useAuthStore(state => state.isLoading)
export const useError = () => useAuthStore(state => state.error)
export const useSession = () => useAuthStore(state => state.session)

// Export actions
export const useAuthActions = () => useAuthStore(state => ({
  login: state.login,
  logout: state.logout,
  updateProfile: state.updateProfile,
  updatePreferences: state.updatePreferences,
  refreshSession: state.refreshSession,
  validateSession: state.validateSession,
  clearError: state.clearError,
  setLoading: state.setLoading,
  mockLogin: state.mockLogin
}))

// Export permission checks
export const usePermissions = () => useAuthStore(state => ({
  hasRole: state.hasRole,
  isIssuer: state.isIssuer,
  isAdmin: state.isAdmin
}))

export default useAuthStore