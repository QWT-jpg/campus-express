import Taro from '@tarojs/taro'
import { API_BASE_URL } from '../config'

function getToken(): string {
  return Taro.getStorageSync('token') || ''
}

async function request<T = any>(url: string, options: {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
} = {}): Promise<T> {
  const { method = 'GET', data } = options
  const token = getToken()

  try {
    const res = await Taro.request({
      url: `${API_BASE_URL}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '1',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    })

    // Handle 401: token expired or invalid
    if (res.statusCode === 401) {
      Taro.removeStorageSync('token')
      Taro.removeStorageSync('user')
      const confirm = await Taro.showModal({
        title: '登录已过期',
        content: '需要重新登录后才能继续使用',
        confirmText: '重新登录',
        cancelText: '稍后再说',
      })
      if (confirm.confirm) {
        try {
          const { code } = await Taro.login()
          if (code) {
            const loginData = await request('/auth/login', { method: 'POST', data: { code } })
            if (loginData?.token) {
              Taro.setStorageSync('token', loginData.token)
              Taro.setStorageSync('user', loginData.user)
              Taro.showToast({ title: '登录成功', icon: 'success' })
              // Notify pages to refresh
              Taro.eventCenter.trigger('login-success')
            }
          }
        } catch (e) { /* login failed, user stays logged out */ }
      }
      throw new Error('请重新登录')
    }

    if (res.data.code === 0) {
      return res.data.data
    }
    throw new Error(res.data.message || '请求失败')
  } catch (e: any) {
    // Don't show duplicate toast for login-related errors (already handled by modal)
    if (e.message && e.message !== '请重新登录' && !e.message.includes('abort')) {
      Taro.showToast({ title: e.message, icon: 'none', duration: 2000 })
    }
    throw e
  }
}

// Auth
export const login = (code: string) =>
  request('/auth/login', { method: 'POST', data: { code } })

// User
export const getProfile = () => request('/user/profile')
export const updateProfile = (data: any) =>
  request('/user/profile', { method: 'PUT', data })

// Orders (user)
export const createOrder = (data: {
  station: string
  building: string
  room?: string
  storeOrder: string
  pickCode?: string
  packageType?: string
  senderPhone?: string
}) => request('/orders', { method: 'POST', data })

export const getMyOrders = (type: 'active' | 'history' = 'active', page = 1, date?: string) =>
  request(`/orders/mine?type=${type}&page=${page}${date ? `&date=${date}` : ''}`)
export const getOrderDetail = (id: number) => request(`/orders/${id}`)
export const cancelMyOrder = (id: number) =>
  request(`/orders/${id}/cancel`, { method: 'POST' })

// Orders (member/admin)
export const getTodayOrders = (station?: string) =>
  request(`/manage/today${station ? `?station=${station}` : ''}`)

export const getHistoryOrders = (page = 1, station?: string, date?: string) =>
  request(`/manage/history?page=${page}&pageSize=20${station ? `&station=${station}` : ''}${date ? `&date=${date}` : ''}`)

export const verifyOrder = (id: number, action: 'pass' | 'reject') =>
  request(`/manage/${id}/verify`, { method: 'POST', data: { action } })

export const pickOrder = (id: number) =>
  request(`/manage/${id}/pick`, { method: 'POST' })

export const deliverOrder = (id: number) =>
  request(`/manage/${id}/deliver`, { method: 'POST' })

export const batchPick = (ids: number[]) =>
  request('/manage/batch-pick', { method: 'POST', data: { ids } })

export const batchDeliver = (ids: number[]) =>
  request('/manage/batch-deliver', { method: 'POST', data: { ids } })

export const cancelOrder = (id: number) =>
  request(`/manage/${id}/cancel`, { method: 'POST' })

// Config
export const getConfig = () => request('/admin/config')

// Stats
export const getTodayStats = () => request('/manage/stats')
