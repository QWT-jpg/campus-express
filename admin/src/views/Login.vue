<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const password = ref('')
const userId = ref('')
const loading = ref(false)
const usePersonal = ref(false)

const handleLogin = async () => {
  if (!password.value) { ElMessage.warning('请输入密码'); return }
  loading.value = true
  try {
    const res = await axios.post('/api/auth/admin-login', {
      password: password.value,
      ...(usePersonal.value && userId.value ? { userId: userId.value } : {}),
    })
    if (res.data.code === 0) {
      localStorage.setItem('admin_token', res.data.data.token)
      localStorage.setItem('admin_user', JSON.stringify(res.data.data.user))
      ElMessage.success(`欢迎，${res.data.data.user.nickname}`)
      router.replace('/')
    } else {
      ElMessage.error(res.data.message || '登录失败')
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <h1 class="login-title">校园快递代拿</h1>
      <p class="login-subtitle">管理后台</p>

      <div class="login-tabs">
        <span :class="['tab', { active: !usePersonal }]" @click="usePersonal = false">管理密码</span>
        <span :class="['tab', { active: usePersonal }]" @click="usePersonal = true">成员登录</span>
      </div>

      <el-input
        v-if="usePersonal"
        v-model="userId"
        placeholder="输入用户ID"
        size="large"
        style="margin-bottom:16px"
      />
      <el-input
        v-model="password"
        type="password"
        :placeholder="usePersonal ? '输入成员密码' : '请输入管理员密码'"
        size="large"
        show-password
        @keyup.enter="handleLogin"
      />
      <el-button type="success" size="large" :loading="loading" @click="handleLogin" class="login-btn">
        登 录
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f0f2f5;
}
.login-card {
  width: 400px; padding: 48px 40px; background: #fff; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}
.login-title { text-align: center; font-size: 24px; color: #10B981; margin: 0 0 8px; }
.login-subtitle { text-align: center; font-size: 14px; color: #999; margin: 0 0 24px; }
.login-btn { width: 100%; margin-top: 16px; }
.login-tabs { display: flex; margin-bottom: 16px; border-radius: 6px; overflow: hidden; border: 1px solid #E5E7EB; }
.tab { flex: 1; text-align: center; padding: 10px; cursor: pointer; font-size: 14px; color: #666; background: #f5f5f5; }
.tab.active { background: #10B981; color: #fff; }
</style>
