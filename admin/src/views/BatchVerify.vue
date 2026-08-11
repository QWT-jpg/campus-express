<script setup>
import { ref } from 'vue'
import { batchVerify, verifyOrder } from '../api'
import { ElMessage } from 'element-plus'

const inputText = ref('')
const loading = ref(false)
const checked = ref(false)
const matched = ref([])
const notFound = ref([])
const alreadyVerified = ref([])
const cancelled = ref([])

async function doMatch() {
  const orderNos = inputText.value
    .split(/[\n\r,，\s\t]+/)
    .map(s => s.trim())
    .filter(Boolean)

  if (!orderNos.length) return ElMessage.warning('请粘贴店铺订单号')

  loading.value = true
  try {
    const data = await batchVerify(orderNos)
    matched.value = data.matched || []
    notFound.value = data.notFound || []
    alreadyVerified.value = data.alreadyVerified || []
    cancelled.value = data.cancelled || []
    ElMessage.success(`匹配 ${matched.value.length} 条，未找到 ${notFound.value.length} 条`)
  } catch { /* handled */ }
  loading.value = false
}

async function confirmVerify() {
  if (!checked.value) return ElMessage.warning('请先确认已逐单核对店铺后台')
  let done = 0
  for (const order of matched.value) {
    try {
      await verifyOrder(order.id, 'pass', order.packageType)
      done++
    } catch {}
  }
  ElMessage.success(`已核验通过 ${done} 单`)
  matched.value = []; alreadyVerified.value = []; cancelled.value = []; notFound.value = []
  inputText.value = ''; checked.value = false
}
</script>

<template>
  <div class="batch-verify">
    <h3 style="margin-bottom:8px">批量核验</h3>
    <p style="color:#909399;font-size:13px;margin-bottom:16px">
      从店铺后台复制订单号粘贴到下方，可用换行、逗号、空格分隔
    </p>

    <el-input
      v-model="inputText"
      type="textarea"
      :rows="8"
      placeholder="粘贴订单号，换行、逗号、空格分隔均可"
    />

    <div class="verify-toolbar">
      <el-checkbox v-model="checked" :disabled="!matched.length">
        我已逐单核对店铺后台（商品与类型匹配）
      </el-checkbox>
      <div>
        <el-button type="primary" @click="doMatch" :loading="loading">匹配订单</el-button>
        <el-button type="success" @click="confirmVerify" :disabled="!checked || !matched.length">
          确认核验通过（{{ matched.length }}单）
        </el-button>
      </div>
    </div>

    <!-- Matched results grouped by package type -->
    <div v-if="matched.length" style="margin-top:20px">
      <div v-for="(orders, type) in { '大件': matched.filter(o=>o.packageType==='大件'), '中件': matched.filter(o=>o.packageType==='中件'), '小件': matched.filter(o=>o.packageType==='小件'), '未选': matched.filter(o=>!o.packageType) }" :key="type">
        <div v-if="orders.length" class="result-group">
          <h4 class="group-title" :style="{color: type==='大件'?'#EF4444':type==='中件'?'#F59E0B':type==='小件'?'#10B981':'#6B7280'}">
            {{ type==='大件'?'🔴':type==='中件'?'🟡':type==='小件'?'🟢':'⚪' }} {{ type }}（{{ orders.length }}单）
          </h4>
          <el-table :data="orders" stripe size="small">
            <el-table-column prop="storeOrder" label="店铺订单号" width="180" />
            <el-table-column prop="pickCode" label="取件码" width="100" />
            <el-table-column prop="building" label="楼栋" width="120" />
            <el-table-column prop="room" label="房间号" width="80" />
          </el-table>
        </div>
      </div>
    </div>

    <!-- Not Found -->
    <div v-if="notFound.length" class="result-group" style="margin-top:20px">
      <h4 class="group-title" style="color:#EF4444">❌ 未找到（{{ notFound.length }}单）</h4>
      <div class="tag-list">
        <el-tag v-for="sno in notFound" :key="sno" type="danger" style="margin:4px">{{ sno }}</el-tag>
      </div>
    </div>

    <!-- Already Verified -->
    <div v-if="alreadyVerified.length" class="result-group">
      <h4 class="group-title" style="color:#6B7280">☑️ 已核验过（{{ alreadyVerified.length }}单）</h4>
    </div>

    <!-- Cancelled -->
    <div v-if="cancelled.length" class="result-group">
      <h4 class="group-title" style="color:#9CA3AF">🗑️ 已取消（{{ cancelled.length }}单）</h4>
    </div>
  </div>
</template>

<style scoped>
.verify-toolbar {
  display: flex; justify-content: space-between; align-items: center; margin-top: 16px;
}
.result-group { margin-bottom: 16px; }
.group-title { font-size: 14px; margin-bottom: 8px; padding: 4px 0; }
.tag-list { padding: 8px 0; }
</style>
