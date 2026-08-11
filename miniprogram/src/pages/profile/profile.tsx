import { useState, useEffect } from 'react'
import { View, Text, Button, Input, Form } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getProfile, updateProfile, login as apiLogin } from '../../utils/api'
import { API_BASE_URL } from '../../config'
import './profile.scss'

function avatarUrl(path: string | null): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${API_BASE_URL}${path}`
}

export default function Profile() {
  const [user, setUser] = useState<any>(null)
  const [editingNickname, setEditingNickname] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [contactInfo, setContactInfo] = useState<any>({})

  useEffect(() => {
    loadUser()
    Taro.eventCenter.on('login-success', loadUser)
    return () => { Taro.eventCenter.off('login-success', loadUser) }
  }, [])

  const loadUser = async () => {
    const token = Taro.getStorageSync('token')
    if (!token) return
    const stored = Taro.getStorageSync('user')
    if (stored) setUser(stored)
    try {
      const profile = await getProfile()
      if (profile) {
        setUser(profile)
        Taro.setStorageSync('user', profile)
      }
    } catch (_) {}
  }

  const onChooseAvatar = async (e) => {
    const { avatarUrl: url } = e.detail
    try {
      const token = Taro.getStorageSync('token')
      await Taro.uploadFile({ url: `${API_BASE_URL}/user/avatar`, filePath: url, name: 'avatar', header: { Authorization: `Bearer ${token}` } })
      await loadUser()
      Taro.showToast({ title: '头像已更新', icon: 'success' })
    } catch (_) {}
  }

  const onNicknameBlur = async (e) => {
    const nickname = e.detail.value?.trim()
    if (!nickname || nickname === user?.nickname) { setEditingNickname(false); return }
    try {
      await updateProfile({ nickname })
      await loadUser()
      Taro.showToast({ title: '昵称已更新', icon: 'success' })
    } catch (_) {}
    setEditingNickname(false)
  }

  const handleLogout = () => {
    Taro.removeStorageSync('token')
    Taro.removeStorageSync('user')
    setUser(null)
    Taro.showToast({ title: '已退出登录', icon: 'success' })
  }

  const handleLogin = async () => {
    if (loggingIn) return
    setLoggingIn(true)
    try {
      Taro.showLoading({ title: '登录中...' })
      const { code } = await Taro.login()
      Taro.hideLoading()
      if (!code) { Taro.showToast({ title: '微信授权失败', icon: 'none' }); return }
      const data = await apiLogin(code)
      if (data?.token) {
        Taro.setStorageSync('token', data.token)
        Taro.setStorageSync('user', data.user)
        loadUser()
        Taro.showToast({ title: '登录成功', icon: 'success' })
        Taro.eventCenter.trigger('login-success')
      }
    } catch (e: any) {
      Taro.hideLoading()
      Taro.showToast({ title: e.message || '网络错误', icon: 'none' })
    } finally {
      setLoggingIn(false)
    }
  }

  if (!user) {
    return (
      <View className='container'>
        <View className='card' style='text-align:center;padding:40px;'>
          <Text style='display:block;margin-bottom:16px;color:#6B7280;'>请先登录</Text>
          <Button className='btn-primary' onClick={handleLogin} loading={loggingIn}>
            {loggingIn ? '登录中...' : '微信一键登录'}
          </Button>
        </View>
      </View>
    )
  }

  return (
    <View className='container'>
      <View className='card profile-header'>
        <Button className='avatar-btn' open-type='chooseAvatar' onChooseAvatar={onChooseAvatar}>
          <View className='avatar'>
            {user.avatarUrl ? (
              <View className='avatar-img' style={{ backgroundImage: `url(${avatarUrl(user.avatarUrl)})` }} />
            ) : (
              <View className='avatar-text'>
                <Text className='avatar-letter'>{(user.nickname || '微')[0]}</Text>
              </View>
            )}
          </View>
          <Text className='avatar-hint'>点击更换头像</Text>
        </Button>
        <View className='profile-info'>
          <Form>
            <Input className='nickname-input' name='nickname' type='nickname' placeholder='点击获取微信昵称' value={user.nickname || ''} maxlength={20} onBlur={onNicknameBlur} />
          </Form>
          <Text className='role-tag'>普通用户</Text>
        </View>
      </View>

      <View className='card menu-list'>
        <View className='menu-item' onClick={async () => {
          try {
            const res = await Taro.request({ url: `${API_BASE_URL}/config`, method: 'GET', header: { 'ngrok-skip-browser-warning': '1' } })
            if (res.data?.code === 0) setContactInfo(res.data.data.contact || {})
          } catch (_) { setContactInfo({}) }
          setShowContact(true)
        }}>
          <Text>联系客服</Text>
          <Text className='menu-arrow'>&gt;</Text>
        </View>
      </View>

      <View className='logout-section'>
        <Button className='btn-logout' onClick={handleLogout}>退出登录</Button>
      </View>

      {/* Contact overlay */}
      {showContact && (
        <View className='overlay' onClick={() => setShowContact(false)}>
          <View className='overlay-card' onClick={e => e.stopPropagation()}>
            <Text className='overlay-title'>联系客服</Text>
            {contactInfo.phone && <View className='overlay-row'><Text className='overlay-label'>电话</Text><Text className='overlay-value'>{contactInfo.phone}</Text></View>}
            {contactInfo.wechat && <View className='overlay-row'><Text className='overlay-label'>微信</Text><Text className='overlay-value'>{contactInfo.wechat}</Text></View>}
            {contactInfo.hours && <View className='overlay-row'><Text className='overlay-label'>时间</Text><Text className='overlay-value'>{contactInfo.hours}</Text></View>}
            {!contactInfo.phone && !contactInfo.wechat && !contactInfo.hours && <Text className='overlay-empty'>暂无联系方式</Text>}
            <Button className='btn-primary' style='margin-top:20px' onClick={() => setShowContact(false)}>关闭</Button>
          </View>
        </View>
      )}
    </View>
  )
}
