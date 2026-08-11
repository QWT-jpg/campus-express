<script setup>
import { ref, onMounted } from 'vue'
import {
  getTodayOrders,
  getHistoryOrders,
  verifyOrder,
  pickOrder,
  deliverOrder,
  batchPick,
  batchDeliver,
  cancelOrder,
  getPublicConfig
} from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'

// --- State ---
const stations = ref([])
const selectedStation = ref('')
const loading = ref(false)
const tab = ref('active')  // 'active' | 'history'
const historyDate = ref(new Date().toISOString().split('T')[0])
const buildingFilter = ref('')  // specific building name or empty
const buildings = ref([])  // all building names
const unverifiedGroups = ref([])
const verifiedGroups = ref([])
const activeBuildings = ref([])
const historyGroups = ref([])
const historyTotal = ref(0)
const historyPage = ref(1)

// Verify dialog
const verifyDialogVisible = ref(false)
const verifyingOrder = ref(null)
const verifyAction = ref('pass')
const verifyPackageType = ref('')
const packageTypes = ['小件', '中件', '大件']

// --- Fetch ---
async function fetchOrders() {
  loading.value = true
  try {
    if (tab.value === 'active') {
      const data = await getTodayOrders(selectedStation.value || undefined, buildingFilter.value || undefined)
      const mapGroup = (list) => (list || []).map(g => ({ ...g, name: g.building, ids: g.orders.map(o => o.id) }))
      unverifiedGroups.value = mapGroup(data.unverified)
      verifiedGroups.value = mapGroup(data.verified)
    } else {
      const data = await getHistoryOrders(historyPage.value, selectedStation.value || undefined, historyDate.value, buildingFilter.value || undefined)
      historyGroups.value = data.dateGroups ?? []
      historyTotal.value = data.total ?? 0
    }
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false
  }
}

async function fetchStations() {
  try {
    const data = await getPublicConfig()
    stations.value = data.stations ?? []
    buildings.value = data.buildings ?? []
  } catch {
    // handled
  }
}

onMounted(() => {
  fetchStations()
  fetchOrders()
})

// --- Tab ---
function switchTab(t) {
  tab.value = t
  historyPage.value = 1
  fetchOrders()
}

// --- Station filter ---
function onStationChange() {
  historyPage.value = 1
  fetchOrders()
}

// --- Status helpers ---
function statusText(status) {
  const map = { '-1': '已取消', 0: '已提交', 1: '已取件', 2: '已送达', 3: '已确认' }
  return map[status] ?? '未知'
}

function statusType(status) {
  const map = { '-1': 'danger', 0: 'info', 1: 'warning', 2: 'primary', 3: 'success' }
  return map[status] ?? 'info'
}

function isCancelled(order) {
  return !!order.cancelledAt
}

// --- Actions ---
function openVerifyDialog(order) {
  verifyingOrder.value = order
  verifyAction.value = 'pass'
  verifyPackageType.value = order.packageType || ''
  verifyDialogVisible.value = true
}

async function doVerify() {
  const order = verifyingOrder.value
  if (!order) return
  try {
    await verifyOrder(order.id, verifyAction.value, verifyPackageType.value)
    ElMessage.success(verifyAction.value === 'pass' ? '核验通过' : '核验拒绝')
    verifyDialogVisible.value = false
    fetchOrders()
  } catch { /* handled */ }
}

async function doPick(id) {
  try {
    await pickOrder(id)
    ElMessage.success('已标记取件')
    fetchOrders()
  } catch { /* handled */ }
}

async function doDeliver(id) {
  try {
    await ElMessageBox.confirm('确认将该订单标记为已送达？送达后订单将进入已完成。', '提示', { type: 'warning' })
    await deliverOrder(id)
    ElMessage.success('已标记送达')
    fetchOrders()
  } catch { /* handled */ }
}

async function doBatchPick(ids) {
  try {
    await ElMessageBox.confirm('确认将整栋已核验的订单标记为已取件？未核验的订单将被跳过。', '提示', { type: 'warning' })
    const res = await batchPick(ids)
    const skipped = ids.length - (res.count || 0)
    ElMessage.success(`已取件 ${res.count} 单` + (skipped > 0 ? `，${skipped} 单未核验已跳过` : ''))
    fetchOrders()
  } catch { /* cancelled or error */ }
}

async function doBatchDeliver(ids) {
  try {
    await ElMessageBox.confirm('确认将整栋已取件的订单标记为已送达？', '提示', { type: 'warning' })
    const res = await batchDeliver(ids)
    const skipped = ids.length - (res.count || 0)
    ElMessage.success(`已送达 ${res.count} 单` + (skipped > 0 ? `，${skipped} 单未取件已跳过` : ''))
    fetchOrders()
  } catch { /* cancelled or error */ }
}

async function doCancel(id) {
  try {
    await ElMessageBox.confirm('确认取消该订单？', '提示', { type: 'warning' })
    await cancelOrder(id)
    ElMessage.success('订单已取消')
    fetchOrders()
  } catch { /* cancelled or error */ }
}

function loadMoreHistory() {
  historyPage.value++
  fetchOrders()
}

function getHistoryCount() {
  return historyGroups.value.reduce((sum, g) => sum + (g.buildings || []).reduce((s, b) => s + b.orders.length, 0), 0)
}
</script>

<template>
  <div class="order-list">
    <!-- Tab bar -->
    <div class="tab-bar">
      <div :class="['tab-btn', { active: tab === 'active' }]" @click="switchTab('active')">
        进行中
      </div>
      <div :class="['tab-btn', { active: tab === 'history' }]" @click="switchTab('history')">
        已完成
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <el-select
        v-model="selectedStation"
        placeholder="选择驿站"
        clearable
        @change="onStationChange"
        style="width: 200px"
      >
        <el-option v-for="s in stations" :key="s" :label="s" :value="s" />
      </el-select>
      <el-select
        v-model="buildingFilter"
        placeholder="选择楼栋"
        clearable
        @change="onStationChange"
        style="width: 160px"
      >
        <el-option v-for="b in buildings" :key="b" :label="b" :value="b" />
      </el-select>
      <el-date-picker
        v-if="tab === 'history'"
        v-model="historyDate"
        type="date"
        placeholder="选择日期"
        format="YYYY-MM-DD"
        value-format="YYYY-MM-DD"
        @change="() => { historyPage = 1; fetchOrders() }"
        style="width: 180px"
      />
      <el-button type="primary" @click="fetchOrders" :loading="loading">
        刷新
      </el-button>
    </div>

    <!-- ===== ACTIVE: Building Groups ===== -->
    <div v-if="tab === 'active'" v-loading="loading">
      <el-empty v-if="!unverifiedGroups.length && !verifiedGroups.length && !loading" description="今日暂无进行中的订单" />

      <template v-else>
        <!-- 未核对 -->
        <h4 v-if="unverifiedGroups.length" style="margin:16px 0 8px;color:#E6A23C">⚠️ 未核对（{{ unverifiedGroups.reduce((s,g) => s + g.orders.length, 0) }}单）</h4>
        <el-collapse v-if="unverifiedGroups.length" v-model="activeBuildings">
          <el-collapse-item v-for="(group, idx) in unverifiedGroups" :key="'u'+group.name" :name="'u'+idx">
            <template #title>
              <div class="building-title">
                <span class="building-name">{{ group.name }}</span>
                <el-tag size="small" type="warning">{{ group.orders.length }} 单</el-tag>
              </div>
            </template>
            <div class="batch-actions">
              <el-button size="small" @click="doBatchPick(group.ids)">整栋已取件</el-button>
              <el-button size="small" type="success" @click="doBatchDeliver(group.ids)">整栋已送达</el-button>
            </div>
            <el-table :data="group.orders" stripe size="small" style="width: 100%; margin-bottom: 0">
              <el-table-column prop="storeOrder" label="店铺订单号" width="180" show-overflow-tooltip />
              <el-table-column label="核验" width="70">
                <template #default="{ row }">
                  <el-tag v-if="row.verified===1" type="success" size="small">✓</el-tag>
                  <el-tag v-else type="info" size="small">待核</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="pickCode" label="取件码" width="100" />
              <el-table-column prop="packageType" label="类型" width="70">
                <template #default="{ row }">{{ row.packageType || '-' }}</template>
              </el-table-column>
              <el-table-column prop="room" label="房间号" width="80" />
              <el-table-column label="状态" width="80">
                <template #default="{ row }">
                  <el-tag v-if="isCancelled(row)" type="danger" size="small">已取消</el-tag>
                  <el-tag v-else :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" min-width="200" fixed="right">
                <template #default="{ row }">
                  <template v-if="row.status === 0">
                    <el-button type="warning" size="small" @click="openVerifyDialog(row)">核验</el-button>
                    <el-button size="small" @click="doPick(row.id)">取件</el-button>
                  </template>
                  <template v-else-if="row.status === 1">
                    <el-button type="success" size="small" @click="doDeliver(row.id)">送达</el-button>
                  </template>
                  <el-button v-if="row.status === 0" type="danger" size="small" plain @click="doCancel(row.id)">取消</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-collapse-item>
        </el-collapse>

        <!-- 已核对 -->
        <h4 v-if="verifiedGroups.length" style="margin:16px 0 8px;color:#10B981">✅ 已核对（{{ verifiedGroups.reduce((s,g) => s + g.orders.length, 0) }}单）</h4>
        <el-collapse v-if="verifiedGroups.length" v-model="activeBuildings">
          <el-collapse-item v-for="(group, idx) in verifiedGroups" :key="'v'+group.name" :name="'v'+idx">
            <template #title>
              <div class="building-title">
                <span class="building-name">{{ group.name }}</span>
                <el-tag size="small" type="success">{{ group.orders.length }} 单</el-tag>
              </div>
            </template>
            <div class="batch-actions">
              <el-button size="small" @click="doBatchPick(group.ids)">整栋已取件</el-button>
              <el-button size="small" type="success" @click="doBatchDeliver(group.ids)">整栋已送达</el-button>
            </div>
            <el-table :data="group.orders" stripe size="small" style="width: 100%; margin-bottom: 0">
              <el-table-column prop="storeOrder" label="店铺订单号" width="180" show-overflow-tooltip />
              <el-table-column label="核验" width="70">
                <template #default="{ row }">
                  <el-tag v-if="row.verified===1" type="success" size="small">✓</el-tag>
                  <el-tag v-else type="info" size="small">待核</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="pickCode" label="取件码" width="100" />
              <el-table-column prop="packageType" label="类型" width="70">
                <template #default="{ row }">{{ row.packageType || '-' }}</template>
              </el-table-column>
              <el-table-column prop="room" label="房间号" width="80" />
              <el-table-column label="状态" width="80">
                <template #default="{ row }">
                  <el-tag v-if="isCancelled(row)" type="danger" size="small">已取消</el-tag>
                  <el-tag v-else :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" min-width="200" fixed="right">
                <template #default="{ row }">
                  <template v-if="row.status === 0">
                    <el-button type="warning" size="small" @click="openVerifyDialog(row)">核验</el-button>
                    <el-button size="small" @click="doPick(row.id)">取件</el-button>
                  </template>
                  <template v-else-if="row.status === 1">
                    <el-button type="success" size="small" @click="doDeliver(row.id)">送达</el-button>
                  </template>
                  <el-button v-if="row.status === 0" type="danger" size="small" plain @click="doCancel(row.id)">取消</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-collapse-item>
        </el-collapse>
      </template>
    </div>

    <!-- ===== HISTORY: Grouped by date then building ===== -->
    <div v-if="tab === 'history'" v-loading="loading">
      <el-empty v-if="!historyGroups.length && !loading" description="暂无已完成订单" />

      <div v-else v-for="group in historyGroups" :key="group.date">
        <h4 style="margin:16px 0 8px;color:#606266;font-size:14px">{{ group.date }}</h4>
        <div v-for="bg in group.buildings" :key="bg.building" style="margin-bottom:12px">
          <h5 style="margin:8px 0 4px;color:#909399;font-size:13px">{{ bg.building }} · {{ bg.count }}单</h5>
          <el-table :data="bg.orders" stripe size="small" style="width: 100%">
            <el-table-column prop="orderNo" label="订单号" width="140" />
            <el-table-column prop="storeOrder" label="店铺订单号" width="200" show-overflow-tooltip />
            <el-table-column prop="pickCode" label="取件码" width="100" />
            <el-table-column prop="room" label="房间号" width="80" />
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="完成时间" width="160">
              <template #default="{ row }">
                {{ row.deliveredAt ? new Date(row.deliveredAt).toLocaleString('zh-CN') : row.confirmedAt ? new Date(row.confirmedAt).toLocaleString('zh-CN') : row.cancelledAt ? new Date(row.cancelledAt).toLocaleString('zh-CN') : '-' }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <div v-if="getHistoryCount() < historyTotal" style="text-align:center;margin-top:16px">
        <el-button @click="loadMoreHistory" :loading="loading">
          加载更多（{{ getHistoryCount() }}/{{ historyTotal }}）
        </el-button>
      </div>
    </div>

    <!-- Verify Dialog -->
    <el-dialog v-model="verifyDialogVisible" title="核验订单" width="480px">
      <div v-if="verifyingOrder">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="店铺订单号"><strong>{{ verifyingOrder.storeOrder }}</strong></el-descriptions-item>
          <el-descriptions-item label="取件码">{{ verifyingOrder.pickCode }}</el-descriptions-item>
          <el-descriptions-item label="包裹类型">
            <el-select v-model="verifyPackageType" size="small" style="width:120px">
              <el-option v-for="t in packageTypes" :key="t" :label="t" :value="t" />
            </el-select>
            <span style="margin-left:8px;color:#909399;font-size:12px">（可修正用户选择）</span>
          </el-descriptions-item>
          <el-descriptions-item label="驿站">{{ verifyingOrder.station }}</el-descriptions-item>
          <el-descriptions-item label="楼栋">{{ verifyingOrder.building }}</el-descriptions-item>
          <el-descriptions-item label="房间号">{{ verifyingOrder.room || '-' }}</el-descriptions-item>
          <el-descriptions-item label="电话">{{ verifyingOrder.senderPhone || '-' }}</el-descriptions-item>
        </el-descriptions>
        <el-divider />
        <el-radio-group v-model="verifyAction">
          <el-radio value="pass" size="large">✅ 核验通过</el-radio>
          <el-radio value="reject" size="large" style="margin-left: 24px">❌ 拒绝</el-radio>
        </el-radio-group>
      </div>
      <template #footer>
        <el-button @click="verifyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="doVerify">确认核验</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.tab-bar {
  display: flex;
  background: #f5f7fa;
  border-radius: 8px;
  padding: 4px;
  margin-bottom: 16px;
}

.tab-btn {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  font-size: 14px;
  border-radius: 6px;
  cursor: pointer;
  color: #606266;
  transition: all 0.2s;
}

.tab-btn.active {
  background: #409EFF;
  color: #fff;
  font-weight: 600;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.building-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.building-name {
  font-weight: 600;
  font-size: 15px;
}

.batch-actions {
  margin-bottom: 8px;
  display: flex;
  gap: 8px;
}
</style>
