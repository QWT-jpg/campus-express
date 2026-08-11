<script>
import { login } from './utils/api.js'

export default {
  onLaunch() {
    const token = uni.getStorageSync('token')
    if (!token) this.doLogin()
  },
  methods: {
    async doLogin() {
      try {
        const [err, res] = await uni.login({ provider: 'weixin' })
        if (err || !res.code) return
        console.log('Got code:', res.code.substring(0, 10) + '...')
        const data = await login(res.code)
        if (data && data.token) {
          uni.setStorageSync('token', data.token)
          uni.setStorageSync('user', data.user)
          console.log('登录成功, ID:', data.user.id, 'role:', data.user.role)
        }
      } catch (e) { console.error('Login:', e.message) }
    }
  }
}
</script>

<style>
@import './uni.scss';
</style>
