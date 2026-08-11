import axios from 'axios'
import { ElMessage } from 'element-plus'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => {
    // Backend returns { code: 0, message, data }
    if (response.data && response.data.code !== undefined && response.data.code !== 0) {
      ElMessage.error(response.data.message || '请求失败')
      return Promise.reject(new Error(response.data.message))
    }
    return response.data.data
  },
  (error) => {
    // 403 means no permission — silently ignore
    if (error.response?.status === 403) {
      return Promise.reject(error)
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.hash = '#/login'
      return Promise.reject(error)
    }
    const msg =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      '请求失败'
    ElMessage.error(msg)
    return Promise.reject(error)
  }
)

// Auth
export const login = (code) => api.post('/auth/login', { code })
export const getProfile = () => api.get('/user/profile')

// Config (admin)
export const getConfig = () => api.get('/admin/config')
export const getPublicConfig = () => api.get('/config')
export const updateStations = (stations) =>
  api.put('/admin/config/stations', { stations })
export const updateBuildings = (buildings) =>
  api.put('/admin/config/buildings', { buildings })
export const updateContact = (contact) =>
  api.put('/admin/config/contact', contact)
export const updateAnnouncement = (content) =>
  api.put('/admin/config/announcement', { content })

// Orders (manage)
export const getTodayOrders = (station, building) =>
  api.get('/manage/today', { params: { ...(station ? { station } : {}), ...(building ? { building } : {}) } })
export const getHistoryOrders = (page = 1, station, date, building) =>
  api.get('/manage/history', { params: { page, pageSize: 20, ...(station ? { station } : {}), ...(date ? { date } : {}), ...(building ? { building } : {}) } })
export const verifyOrder = (id, action, packageType) =>
  api.post(`/manage/${id}/verify`, { action, packageType })
export const pickOrder = (id) => api.post(`/manage/${id}/pick`)
export const deliverOrder = (id) => api.post(`/manage/${id}/deliver`)
export const batchPick = (ids) => api.post('/manage/batch-pick', { ids })
export const batchDeliver = (ids) => api.post('/manage/batch-deliver', { ids })
export const cancelOrder = (id) => api.post(`/manage/${id}/cancel`)

// Members (admin)
export const getMembers = () => api.get('/admin/members')
export const addMember = (userId) => api.post('/admin/members', { userId })
export const removeMember = (id) => api.delete(`/admin/members/${id}`)
export const setMemberPassword = (userId, password) =>
  api.put('/admin/members/password', { userId, password })

// Batch verify
export const batchVerify = (orders) => api.post('/manage/batch-verify', { orders })

// Stats (admin)
export const getStats = () => api.get('/manage/stats')

export default api
