import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { login as apiLogin } from './utils/api'
import './app.scss'

function App({ children }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    doInit()
  }, [])

  const doInit = async () => {
    const token = Taro.getStorageSync('token')
    if (token) {
      // Already have token, go ahead
      setReady(true)
      return
    }
    // No token, attempt login
    try {
      const { code } = await Taro.login()
      if (!code) {
        setReady(true) // no code but still render, user will see login prompt
        return
      }
      console.log('Got WeChat code:', code.substring(0, 10) + '...')
      const data = await apiLogin(code)
      if (data?.token) {
        Taro.setStorageSync('token', data.token)
        Taro.setStorageSync('user', data.user)
        console.log('登录成功, 用户ID:', data.user?.id, 'role:', data.user?.role)
      }
    } catch (e: any) {
      console.error('Login error:', e.message)
    }
    setReady(true)
  }

  if (!ready) {
    return null // Wait until login attempt completes
  }

  return children
}

export default App
