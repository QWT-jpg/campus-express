<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import {
  DataAnalysis,
  List,
  Setting,
  UserFilled,
  SwitchButton,
  Checked
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isCollapsed = ref(false)

const adminUser = ref(JSON.parse(localStorage.getItem('admin_user') || 'null'))
// Watch for route changes to refresh user info
router.afterEach(() => {
  const u = localStorage.getItem('admin_user')
  adminUser.value = u ? JSON.parse(u) : null
})

const allMenuItems = [
  { path: '/', label: '仪表盘', icon: DataAnalysis, adminOnly: false },
  { path: '/orders', label: '订单管理', icon: List, adminOnly: false },
  { path: '/verify', label: '批量核验', icon: Checked, adminOnly: false },
  { path: '/members', label: '团队管理', icon: UserFilled, adminOnly: true },
  { path: '/settings', label: '系统设置', icon: Setting, adminOnly: true },
]

const menuItems = computed(() =>
  allMenuItems.filter(m => !m.adminOnly || adminUser.value?.role >= 2)
)

const activeMenu = computed(() => route.path)

function handleMenuSelect(path) {
  router.push(path)
}

function handleLogout() {
  authStore.logout()
  localStorage.removeItem('admin_user')
  router.replace('/login')
}
</script>

<template>
  <el-container class="app-container">
    <!-- Sidebar -->
    <el-aside :width="isCollapsed ? '64px' : '220px'" class="app-aside">
      <div class="aside-header">
        <span v-show="!isCollapsed" class="app-title">校园快递</span>
        <el-button
          :icon="isCollapsed ? 'Expand' : 'Fold'"
          text
          size="small"
          @click="isCollapsed = !isCollapsed"
          class="collapse-btn"
        />
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapsed"
        :collapse-transition="false"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        router
        @select="handleMenuSelect"
      >
        <el-menu-item
          v-for="item in menuItems"
          :key="item.path"
          :index="item.path"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.label }}</template>
        </el-menu-item>
      </el-menu>

      <div class="aside-footer">
        <el-button
          type="danger"
          text
          size="small"
          :icon="SwitchButton"
          @click="handleLogout"
          style="color: #f56c6c"
        >
          <span v-show="!isCollapsed">退出登录</span>
        </el-button>
      </div>
    </el-aside>

    <!-- Main -->
    <el-container class="app-main-container">
      <el-header class="app-header" height="50px">
        <div class="header-breadcrumb">
          <span class="header-title">
            {{ menuItems.find(m => m.path === activeMenu)?.label || '管理后台' }}
          </span>
        </div>
      </el-header>
      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.app-container {
  height: 100%;
}

.app-aside {
  background-color: #304156;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.3s;
}

.aside-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  height: 50px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.app-title {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
}

.collapse-btn {
  color: #bfcbd9;
}

.el-menu {
  border-right: none;
  flex: 1;
}

.aside-footer {
  padding: 8px 16px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.app-header {
  background: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.header-breadcrumb {
  display: flex;
  align-items: center;
}

.header-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.app-main {
  background: #f5f7fa;
  padding: 20px;
  min-height: 0;
}
</style>
