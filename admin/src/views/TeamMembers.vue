<script setup>
import { ref, onMounted } from 'vue'
import { getMembers, addMember, removeMember, setMemberPassword } from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const members = ref([])
const loading = ref(false)
const addingLoading = ref(false)
const newUserId = ref('')
const dialogVisible = ref(false)

// Password dialog
const pwdVisible = ref(false)
const pwdUserId = ref('')
const pwdNickname = ref('')
const newPassword = ref('')
const pwdLoading = ref(false)

async function fetchMembers() {
  loading.value = true
  try {
    const data = await getMembers()
    members.value = data.members ?? data ?? []
  } catch { /* handled */ }
  loading.value = false
}

function openAddDialog() {
  newUserId.value = ''
  dialogVisible.value = true
}

async function doAddMember() {
  const val = newUserId.value.trim()
  if (!val) { ElMessage.warning('请输入用户ID'); return }
  addingLoading.value = true
  try {
    await addMember(val)
    ElMessage.success('添加成功')
    dialogVisible.value = false
    fetchMembers()
  } catch { /* handled */ }
  addingLoading.value = false
}

async function doRemoveMember(row) {
  try {
    await ElMessageBox.confirm(`确认移除成员「${row.nickname || '未知'}」？`, '提示', { type: 'warning' })
    await removeMember(row.id)
    ElMessage.success('已移除')
    fetchMembers()
  } catch { /* cancelled */ }
}

function openPwdDialog(row) {
  pwdUserId.value = row.id
  pwdNickname.value = row.nickname || '未知'
  newPassword.value = ''
  pwdVisible.value = true
}

async function savePassword() {
  if (!newPassword.value.trim()) { ElMessage.warning('请输入密码'); return }
  pwdLoading.value = true
  try {
    await setMemberPassword(pwdUserId.value, newPassword.value)
    ElMessage.success('密码已设置')
    pwdVisible.value = false
  } catch { /* handled */ }
  pwdLoading.value = false
}

onMounted(() => { fetchMembers() })
</script>

<template>
  <div class="team-members">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>团队成员（用户ID可在小程序「我的」页面查看Console日志）</span>
          <el-button type="primary" :icon="Plus" @click="openAddDialog">添加成员</el-button>
        </div>
      </template>

      <el-table :data="members" stripe v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="用户ID" width="80" />
        <el-table-column label="昵称" min-width="120">
          <template #default="{ row }">{{ row.nickname || '-' }}</template>
        </el-table-column>
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.role === 2 ? 'danger' : ''">{{ row.role === 2 ? '管理员' : '团队成员' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="openPwdDialog(row)">设置密码</el-button>
            <el-button size="small" type="danger" @click="doRemoveMember(row)">移除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!members.length && !loading" description="暂无成员" />
    </el-card>

    <!-- Add Member Dialog -->
    <el-dialog v-model="dialogVisible" title="添加成员" width="400px">
      <el-input v-model="newUserId" placeholder="请输入用户ID" @keyup.enter="doAddMember" />
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="doAddMember" :loading="addingLoading">确认添加</el-button>
      </template>
    </el-dialog>

    <!-- Set Password Dialog -->
    <el-dialog v-model="pwdVisible" title="设置个人密码" width="400px">
      <p style="margin-bottom:16px">为 <strong>{{ pwdNickname }}</strong>（ID: {{ pwdUserId }}）设置登录密码</p>
      <el-input v-model="newPassword" type="password" placeholder="输入新密码" show-password />
      <template #footer>
        <el-button @click="pwdVisible = false">取消</el-button>
        <el-button type="primary" @click="savePassword" :loading="pwdLoading">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>
