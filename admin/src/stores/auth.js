import { defineStore } from 'pinia'
import { login as apiLogin, getProfile } from '../api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('admin_token') || '',
    user: null
  }),

  getters: {
    isLoggedIn: (state) => !!state.token
  },

  actions: {
    async login(code) {
      const data = await apiLogin(code)
      this.token = data.token
      localStorage.setItem('admin_token', data.token)
    },

    async fetchProfile() {
      const data = await getProfile()
      this.user = data
    },

    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('admin_token')
    }
  }
})
