<template>
<view class="container">
  <view v-if="announcement" class="announcement-bar" :class="{expanded:annExpanded}" @click="annExpanded=!annExpanded">
    {{announcement}}
  </view>
  <view v-if="announcement" class="announcement-toggle" @click="annExpanded=!annExpanded">
    {{annExpanded?'收起 ▲':'展开全文 ▼'}}
  </view>

  <view class="card">
    <view class="form-item">
      <text class="form-label">驿站 *</text>
      <view class="radio-group">
        <view v-for="s in stations" :key="s" :class="['radio-item', {active:station===s}]" @click="station=s">{{s}}</view>
      </view>
    </view>

    <view class="form-item">
      <text class="form-label">楼栋 *</text>
      <view v-for="g in districtGroups" :key="g.name" class="district-group">
        <view class="district-toggle" @click="toggleDistrict(g.name)">
          <text class="district-name">{{g.name}}</text>
          <text class="district-arrow">{{expanded[g.name]?'▾':'▸'}}</text>
        </view>
        <view v-if="expanded[g.name]" class="building-grid">
          <view v-for="b in g.buildings" :key="b"
            :class="['building-item', {active:building===g.name+b}]"
            @click="building=g.name+b">{{b}}</view>
        </view>
      </view>
    </view>

    <view class="form-item">
      <text class="form-label">房间号（选填）</text>
      <input class="form-input" placeholder="如：502" v-model="room" />
    </view>

    <view class="form-item">
      <text class="form-label">店铺订单号 *</text>
      <input class="form-input" placeholder="付款后复制店铺订单号" v-model="storeOrder" maxlength="50" />
      <view class="shop-hint" @click="goToShop">📎 还没付款？去店铺下单</view>
    </view>

    <view class="form-item">
      <text class="form-label">取件码 *</text>
      <input class="form-input" placeholder="如：3-5018" v-model="pickCode" maxlength="20" />
    </view>

    <view class="form-item">
      <text class="form-label">包裹类型 *</text>
      <view class="radio-group">
        <view v-for="t in ['小件','中件','大件']" :key="t"
          :class="['radio-item', {active:packageType===t}]" @click="packageType=packageType===t?'':t">{{t}}</view>
      </view>
    </view>

    <view class="form-item">
      <text class="form-label">联系电话（选填）</text>
      <input class="form-input" placeholder="方便联系您" v-model="senderPhone" maxlength="11" type="number" />
    </view>

    <button class="btn-primary" @click="handleSubmit" :disabled="submitting" :loading="submitting">提交</button>
  </view>
</view>
</template>

<script>
import { createOrder, getPublicConfig } from '../../utils/api.js'

const defaultGroups = [
  { name:'西区', buildings:['1号楼','2号楼','3号楼','4号楼','5号楼','6号楼','7号楼'] },
  { name:'东区', buildings:['1号楼','2号楼','3号楼','4号楼','5号楼','6号楼','7号楼','8号楼','9号楼'] }
]

export default {
  data() { return {
    stations:['校内驿站','校外驿站'], station:'', building:'', room:'', storeOrder:'', pickCode:'', packageType:'',
    senderPhone:'', submitting:false, districtGroups:defaultGroups, expanded:{}, announcement:'', annExpanded:false
  }},
  onLoad() { this.loadConfig() },
  onPullDownRefresh() { this.loadConfig(); uni.stopPullDownRefresh() },
  methods: {
    async loadConfig() {
      try {
        const data = await getPublicConfig()
        this.stations = data.stations || ['校内驿站','校外驿站']
        this.announcement = data.announcement || ''
        const blds = data.buildings || []
        if (blds.length) {
          const map = {}; blds.forEach(b => { const m=b.match(/^(.+?区)(.+)$/); const d=m?m[1]:'其他'; const n=m?m[2]:b; if(!map[d])map[d]=[]; map[d].push(n) })
          this.districtGroups = Object.entries(map).map(([n,b])=>({name:n,buildings:b}))
        }
      } catch(e) {}
    },
    toggleDistrict(name) { this.$set(this.expanded, name, !this.expanded[name]) },
    goToShop() {
      uni.navigateToMiniProgram({ appId:'wx065157f19be4e85d', path:'', fail:()=>uni.showToast({title:'跳转失败',icon:'none'}) })
    },
    async handleSubmit() {
      if(!this.station) return uni.showToast({title:'请选择驿站',icon:'none'})
      if(!this.building) return uni.showToast({title:'请选择楼栋',icon:'none'})
      if(!this.storeOrder.trim()) return uni.showToast({title:'请填写店铺订单号',icon:'none'})
      if(!this.pickCode.trim()) return uni.showToast({title:'请填写取件码',icon:'none'})
      if(!this.packageType) return uni.showToast({title:'请选择包裹类型',icon:'none'})
      this.submitting=true
      try {
        await createOrder({ station:this.station, building:this.building, room:this.room||undefined,
          storeOrder:this.storeOrder.trim(), pickCode:this.pickCode.trim(), packageType:this.packageType,
          senderPhone:this.senderPhone||undefined })
        uni.showToast({title:'提交成功',icon:'success'})
        this.room=''; this.storeOrder=''; this.pickCode=''; this.senderPhone=''; this.packageType=''; this.building=''
      } catch(e) {} finally { this.submitting=false }
    }
  }
}
</script>
