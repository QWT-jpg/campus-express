<template>
<view class="container">
  <!-- Not logged in -->
  <view v-if="!user" class="card login-box">
    <text class="login-icon">📦</text>
    <text class="login-text">登录后即可下单代拿快递</text>
    <button class="btn-primary" @click="handleLogin" :loading="loggingIn">{{loggingIn?'登录中...':'微信一键登录'}}</button>
  </view>

  <!-- Logged in -->
  <template v-else>
    <view class="card profile-header">
      <view class="avatar"><text class="avatar-text">{{(user.nickname||'微')[0]}}</text></view>
      <view class="profile-info">
        <input class="nickname-input" v-model="nickname" placeholder="输入昵称" maxlength="20" @blur="saveNickname" />
        <text class="role-tag">普通用户</text>
      </view>
    </view>

    <view class="card menu-list">
      <view class="menu-item" @click="showContact">
        <text>联系客服</text><text class="menu-arrow">></text>
      </view>
    </view>

    <button class="btn-logout" @click="handleLogout">退出登录</button>
  </template>

  <!-- Contact overlay -->
  <view v-if="contactVisible" class="overlay" @click="contactVisible=false">
    <view class="overlay-card" @click.stop>
      <text class="overlay-title">联系客服</text>
      <view v-if="contact.phone" class="overlay-row"><text class="overlay-label">电话</text><text class="overlay-value">{{contact.phone}}</text></view>
      <view v-if="contact.wechat" class="overlay-row"><text class="overlay-label">微信</text><text class="overlay-value">{{contact.wechat}}</text></view>
      <view v-if="contact.hours" class="overlay-row"><text class="overlay-label">时间</text><text class="overlay-value">{{contact.hours}}</text></view>
      <view v-if="!contact.phone&&!contact.wechat&&!contact.hours" style="text-align:center;color:#6B7280;padding:20rpx 0">暂无联系方式</view>
      <button class="btn-primary" style="margin-top:20rpx" @click="contactVisible=false">关闭</button>
    </view>
  </view>
</view>
</template>

<script>
import { login, getProfile, updateProfile, getPublicConfig } from '../../utils/api.js'

export default {
  data() { return { user:null, nickname:'', loggingIn:false, contactVisible:false, contact:{} }},
  onLoad() { this.loadUser() },
  methods: {
    async loadUser() {
      const token = uni.getStorageSync('token'); if(!token) return
      const u = uni.getStorageSync('user'); if(u) { this.user=u; this.nickname=u.nickname||'' }
      try { const p = await getProfile(); if(p) { this.user=p; this.nickname=p.nickname||''; uni.setStorageSync('user',p) } } catch(e) {}
    },
    async handleLogin() {
      this.loggingIn=true
      try {
        uni.showLoading({title:'登录中...'})
        const [err,res] = await uni.login({provider:'weixin'})
        uni.hideLoading()
        if(err||!res.code) { uni.showToast({title:'微信授权失败',icon:'none'}); return }
        const data = await login(res.code)
        if(data&&data.token) { uni.setStorageSync('token',data.token); uni.setStorageSync('user',data.user); this.loadUser(); uni.showToast({title:'登录成功',icon:'success'}) }
      } catch(e) { uni.hideLoading(); uni.showToast({title:e.message||'网络错误',icon:'none'}) }
      finally { this.loggingIn=false }
    },
    handleLogout() { uni.removeStorageSync('token'); uni.removeStorageSync('user'); this.user=null; uni.showToast({title:'已退出登录',icon:'success'}) },
    async saveNickname() {
      if(!this.nickname.trim()||this.nickname===this.user.nickname) return
      try { await updateProfile({nickname:this.nickname}); this.loadUser(); uni.showToast({title:'昵称已更新',icon:'success'}) } catch(e) {}
    },
    async showContact() {
      try { const d = await getPublicConfig(); this.contact = d.contact||{} } catch(e) { this.contact={} }
      this.contactVisible=true
    }
  }
}
</script>
