<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getStats } from '../api'
import {
  Document,
  Check,
  Van,
  CircleCheckFilled
} from '@element-plus/icons-vue'

const stats = reactive({
  total: 0,
  picked: 0,
  delivered: 0,
  confirmed: 0
})

const buildings = ref([])
const loading = ref(false)

async function fetchStats() {
  loading.value = true
  try {
    const data = await getStats()
    stats.total = data.total ?? 0
    stats.picked = data.picked ?? 0
    stats.delivered = data.delivered ?? 0
    stats.confirmed = data.confirmed ?? 0
    buildings.value = data.buildings ?? []
  } catch {
    // error handled by interceptor
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchStats()
})
</script>

<template>
  <div class="dashboard">
    <!-- Stats Cards -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #e6f7ff">
              <el-icon :size="28" color="#1890ff"><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.total }}</div>
              <div class="stat-label">今日订单</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #e6fffb">
              <el-icon :size="28" color="#13c2c2"><Check /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.picked }}</div>
              <div class="stat-label">已取件</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #f6ffed">
              <el-icon :size="28" color="#52c41a"><Van /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.delivered }}</div>
              <div class="stat-label">已送达</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #fff7e6">
              <el-icon :size="28" color="#fa8c16"><CircleCheckFilled /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.confirmed }}</div>
              <div class="stat-label">已确认</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Building Distribution -->
    <el-card shadow="hover" class="section-card">
      <template #header>
        <div class="card-header">
          <span>楼栋订单分布</span>
          <el-button type="primary" size="small" @click="fetchStats" :loading="loading">
            刷新
          </el-button>
        </div>
      </template>
      <el-table v-if="buildings.length" :data="buildings" stripe style="width: 100%">
        <el-table-column prop="name" label="楼栋" />
        <el-table-column prop="count" label="订单数" width="120" align="center" />
        <el-table-column label="占比" width="180" align="center">
          <template #default="{ row }">
            <el-progress
              :percentage="stats.total ? Math.round((row.count / stats.total) * 100) : 0"
              :stroke-width="16"
            />
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="暂无数据" />
    </el-card>
  </div>
</template>

<style scoped>
.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  cursor: default;
}

.stat-card :deep(.el-card__body) {
  padding: 20px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-card {
  margin-top: 0;
}
</style>
