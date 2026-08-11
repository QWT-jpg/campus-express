const BASE_URL = 'http://172.20.10.2:3000'

function getToken() { return uni.getStorageSync('token') || '' }

async function request(url, { method = 'GET', data } = {}) {
  const token = getToken()
  try {
    const [err, res] = await uni.request({
      url: BASE_URL + url,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': 'Bearer ' + token } : {})
      }
    })
    if (err) throw new Error(err.errMsg || '请求失败')
    if (res.data.code === 0) return res.data.data
    if (res.statusCode === 401) {
      uni.removeStorageSync('token')
      uni.removeStorageSync('user')
      uni.showModal({
        title: '登录已过期',
        content: '需要重新登录',
        confirmText: '重新登录',
        success: r => { if (r.confirm) doLogin() }
      })
      throw new Error('请重新登录')
    }
    throw new Error(res.data.message || '请求失败')
  } catch (e) {
    if (e.message) uni.showToast({ title: e.message, icon: 'none' })
    throw e
  }
}

// Auth
export const login = (code) => request('/auth/login', { method: 'POST', data: { code } })

// User
export const getProfile = () => request('/user/profile')
export const updateProfile = (data) => request('/user/profile', { method: 'PUT', data })

// Orders
export const createOrder = (data) => request('/orders', { method: 'POST', data })
export const getMyOrders = (type = 'active', page = 1, date) =>
  request(`/orders/mine?type=${type}&page=${page}${date ? '&date=' + date : ''}`)
export const cancelMyOrder = (id) => request(`/orders/${id}/cancel`, { method: 'POST' })

// Config
export const getPublicConfig = () => request('/config')

export default { BASE_URL, login, getProfile, updateProfile, createOrder, getMyOrders, cancelMyOrder, getPublicConfig }
