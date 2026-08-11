<template>
<view class="container">
  <view class="tab-bar">
    <view :class="['tab-item',{active:tab==='active'}]" @click="switchTab('active')">进行中</view>
    <view :class="['tab-item',{active:tab==='history'}]" @click="switchTab('history')">已完成</view>
  </view>

  <view v-if="tab==='history'" class="filter-bar">
    <picker mode="date" :value="historyDate" @change="e=>{historyDate=e.detail.value;loadAll()}">
      <view class="date-btn">📅 {{historyDate}}</view>
    </picker>
  </view>

  <view v-if="loading" class="empty-state">加载中...</view>

  <!-- Active -->
  <template v-else-if="tab==='active'">
    <view v-if="!myOrders.length" class="empty-state">
      <text class="empty-icon">📋</text>暂无进行中的订单
    </view>
    <view v-for="order in myOrders" :key="order.id" class="card">
      <view class="order-header">
        <text class="order-no">#{{order.orderNo}}</text>
        <text :class="['status-tag','status-'+order.status]">{{['已提交','已取件','已送达','已确认'][order.status]||'未知'}}</text>
      </view>
      <view class="order-body">
        <text>{{order.station}} → {{order.building}}{{order.room?' '+order.room+'室':''}}</text>
      </view>
      <view v-if="order.status===0" class="order-action">
        <text class="btn-small cancel" @click="doCancel(order)">取消</text>
      </view>
    </view>
  </template>

  <!-- History -->
  <template v-else>
    <view v-if="!historyGroups.length" class="empty-state">
      <text class="empty-icon">📭</text>暂无已完成订单
    </view>
    <view v-for="group in historyGroups" :key="group.date">
      <view class="date-header">{{group.date}}</view>
      <view v-for="bg in group.buildings" :key="bg.building">
        <view class="building-sub-header">{{bg.building}} · {{bg.count}}单</view>
        <view v-for="order in bg.orders" :key="order.id" class="card">
          <view class="order-header">
            <text class="order-no">#{{order.orderNo}}</text>
            <text :class="['status-tag','status-'+(order.status===-1?-1:order.status)]">
              {{order.status===-1?'已取消':['已提交','已取件','已送达','已确认'][order.status]||'未知'}}
            </text>
          </view>
          <view class="order-body">
            <text>{{order.station}} → {{order.building}}{{order.room?' '+order.room+'室':''}}</text>
          </view>
        </view>
      </view>
    </view>
    <view v-if="historyGroups.length && historyGroups.reduce((s,g)=>s+(g.buildings||[]).reduce((x,b)=>x+b.orders.length,0),0) < historyTotal"
      class="btn-primary" style="margin-top:16rpx" @click="loadMore">加载更多</view>
  </template>
</view>
</template>

<script>
import { getMyOrders, cancelMyOrder } from '../../utils/api.js'

function todayStr() { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

export default {
  data() { return {
    tab:'active', myOrders:[], historyGroups:[], historyTotal:0, historyDate:todayStr(), loading:false, page:1
  }},
  onShow() { this.loadAll() },
  onPullDownRefresh() { this.loadAll(); uni.stopPullDownRefresh() },
  methods: {
    switchTab(t) { this.tab=t; this.page=1; this.loadAll() },
    async loadAll() {
      this.loading=true
      try {
        if(this.tab==='history') {
          const data = await getMyOrders('history', this.page, this.historyDate)
          this.historyGroups = data.dateGroups || []
          this.historyTotal = data.total || 0
        } else {
          const data = await getMyOrders('active')
          this.myOrders = data.orders || []
        }
      } catch(e) {} finally { this.loading=false }
    },
    loadMore() { this.page++; this.loadAll() },
    async doCancel(order) {
      const res = await uni.showModal({title:'取消订单',content:'确认取消该订单？'})
      if(!res.confirm) return
      try { await cancelMyOrder(order.id); uni.showToast({title:'已取消',icon:'success'}); this.loadAll() } catch(e) {}
    }
  }
}
</script>
