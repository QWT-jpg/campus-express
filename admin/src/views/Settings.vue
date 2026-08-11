<script setup>
import { ref, onMounted } from 'vue'
import { getConfig, updateStations, updateBuildings, updateContact, updateAnnouncement } from '../api'
import { ElMessage } from 'element-plus'

const stations = ref([])
const buildings = ref([])
const contact = ref({ phone: '', wechat: '', hours: '' })
const announcement = ref('')

const newStation = ref('')
const newBuilding = ref('')
const stationsLoading = ref(false)
const buildingsLoading = ref(false)
const contactLoading = ref(false)
const announcementLoading = ref(false)
const loading = ref(false)

async function fetchConfig() {
  loading.value = true
  try {
    const data = await getConfig()
    stations.value = data.stations ?? []
    buildings.value = data.buildings ?? []
    contact.value = data.contact ?? { phone: '', wechat: '', hours: '' }
    announcement.value = data.announcement ?? ''
  } catch { /* handled */ }
  loading.value = false
}

// --- Stations ---
function addStation() {
  const val = newStation.value.trim()
  if (!val) return
  if (stations.value.includes(val)) { ElMessage.warning('该驿站已存在'); return }
  stations.value.push(val)
  newStation.value = ''
}
function removeStation(index) { stations.value.splice(index, 1) }
async function saveStations() {
  stationsLoading.value = true
  try { await updateStations(stations.value); ElMessage.success('驿站保存成功') } catch {}
  stationsLoading.value = false
}

// --- Buildings ---
function addBuilding() {
  const val = newBuilding.value.trim()
  if (!val) return
  if (buildings.value.includes(val)) { ElMessage.warning('该楼栋已存在'); return }
  buildings.value.push(val)
  newBuilding.value = ''
}
function removeBuilding(index) { buildings.value.splice(index, 1) }
async function saveBuildings() {
  buildingsLoading.value = true
  try { await updateBuildings(buildings.value); ElMessage.success('楼栋保存成功') } catch {}
  buildingsLoading.value = false
}

// --- Contact ---
async function saveContact() {
  contactLoading.value = true
  try { await updateContact(contact.value); ElMessage.success('联系信息保存成功') } catch {}
  contactLoading.value = false
}

// --- Announcement ---
async function saveAnnouncement() {
  announcementLoading.value = true
  try { await updateAnnouncement(announcement.value); ElMessage.success('公告保存成功') } catch {}
  announcementLoading.value = false
}

onMounted(() => { fetchConfig() })
</script>

<template>
  <div class="settings" v-loading="loading">

    <!-- Stations -->
    <el-card shadow="hover" class="section-card">
      <template #header><span>驿站管理</span></template>
      <div class="tag-list">
        <el-tag v-for="(item, idx) in stations" :key="idx" closable @close="removeStation(idx)" size="large">{{ item }}</el-tag>
        <el-empty v-if="!stations.length" description="暂无驿站" :image-size="60" />
      </div>
      <div class="input-row">
        <el-input v-model="newStation" placeholder="输入驿站名称" style="width:240px" @keyup.enter="addStation" />
        <el-button type="primary" @click="addStation">添加</el-button>
        <el-button type="success" @click="saveStations" :loading="stationsLoading">保存</el-button>
      </div>
    </el-card>

    <!-- Buildings -->
    <el-card shadow="hover" class="section-card">
      <template #header><span>楼栋管理</span></template>
      <div class="tag-list">
        <el-tag v-for="(item, idx) in buildings" :key="idx" closable @close="removeBuilding(idx)" size="large">{{ item }}</el-tag>
        <el-empty v-if="!buildings.length" description="暂无楼栋" :image-size="60" />
      </div>
      <div class="input-row">
        <el-input v-model="newBuilding" placeholder="输入楼栋名称" style="width:240px" @keyup.enter="addBuilding" />
        <el-button type="primary" @click="addBuilding">添加</el-button>
        <el-button type="success" @click="saveBuildings" :loading="buildingsLoading">保存</el-button>
      </div>
    </el-card>

    <!-- Contact -->
    <el-card shadow="hover" class="section-card">
      <template #header><span>联系客服（同步到小程序"我的"页面）</span></template>
      <el-form label-width="80px" label-position="left">
        <el-form-item label="客服电话">
          <el-input v-model="contact.phone" placeholder="如：13800138000" style="width:240px" />
        </el-form-item>
        <el-form-item label="微信号">
          <el-input v-model="contact.wechat" placeholder="如：campus_express" style="width:240px" />
        </el-form-item>
        <el-form-item label="工作时间">
          <el-input v-model="contact.hours" placeholder="如：9:00-21:00" style="width:240px" />
        </el-form-item>
      </el-form>
      <el-button type="success" @click="saveContact" :loading="contactLoading">保存</el-button>
    </el-card>

    <!-- Announcement -->
    <el-card shadow="hover" class="section-card">
      <template #header><span>公告（同步到小程序首页）</span></template>
      <el-input v-model="announcement" type="textarea" :rows="4" placeholder="输入公告内容，会显示在小程序首页顶部" />
      <div style="margin-top:12px">
        <el-button type="success" @click="saveAnnouncement" :loading="announcementLoading">保存</el-button>
      </div>
    </el-card>

  </div>
</template>

<style scoped>
.section-card { margin-bottom: 20px; }
.tag-list { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; min-height: 60px; }
.input-row { display: flex; align-items: center; gap: 10px; }
</style>
