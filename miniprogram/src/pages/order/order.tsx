import { useState, useEffect } from 'react'
import { View, Text, Picker } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { getMyOrders, cancelMyOrder } from '../../utils/api'
import './order.scss'

function getStatusText(status: number): string {
  if (status === -1) return '已取消'
  return ['已提交', '已取件', '已送达', '已确认'][status] || '未知'
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function Order() {
  const [tab, setTab] = useState<'active' | 'history'>('active')
  const [myOrders, setMyOrders] = useState<any[]>([])
  const [historyGroups, setHistoryGroups] = useState<any[]>([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyDate, setHistoryDate] = useState(todayStr())
  const [loading, setLoading] = useState(false)

  useDidShow(() => { loadAll() })

  usePullDownRefresh(() => { loadAll(); Taro.stopPullDownRefresh() })

  useEffect(() => { loadAll() }, [tab, historyDate])

  const loadAll = async () => {
    setLoading(true)
    try {
      if (tab === 'history') {
        const data = await getMyOrders('history', 1, historyDate)
        setHistoryGroups(data.dateGroups || [])
        setHistoryTotal(data.total || 0)
      } else {
        const data = await getMyOrders('active')
        setMyOrders(data.orders || [])
      }
    } catch (_) {}
    setLoading(false)
  }

  const switchTab = (t: 'active' | 'history') => {
    setTab(t)
  }

  return (
    <View className='container'>
      {/* Tab bar */}
      <View className='tab-bar'>
        <View className={`tab-item ${tab === 'active' ? 'active' : ''}`} onClick={() => switchTab('active')}>
          进行中
        </View>
        <View className={`tab-item ${tab === 'history' ? 'active' : ''}`} onClick={() => switchTab('history')}>
          已完成
        </View>
      </View>

      {/* Date picker for history */}
      {tab === 'history' && (
        <View className='filter-bar'>
          <Picker mode='date' value={historyDate} onChange={e => setHistoryDate(e.detail.value)}>
            <View className='filter-tag active'>📅 {historyDate}</View>
          </Picker>
        </View>
      )}

      {loading ? (
        <View className='empty-state'>加载中...</View>
      ) : tab === 'active' ? (
        myOrders.length === 0 ? (
          <View className='empty-state'>
            <Text className='empty-icon'>📋</Text>
            <Text className='empty-sub'>暂无进行中的订单</Text>
          </View>
        ) : (
          myOrders.map(order => (
            <View key={order.id} className='card'>
              <View className='order-header'>
                <Text className='order-no'>#{order.orderNo}</Text>
                <Text className={`status-tag status-${order.status}`}>
                  {getStatusText(order.status)}
                </Text>
              </View>
              <View className='order-body'>
                <Text>{order.station} → {order.building}{order.room ? ` ${order.room}室` : ''}</Text>
              </View>
              {order.status === 0 && (
                <View className='order-action'>
                  <View className='btn-small cancel' onClick={() => {
                    Taro.showModal({ title: '取消订单', content: '确认取消该订单？', success: async (res) => {
                      if (res.confirm) { try { await cancelMyOrder(order.id); Taro.showToast({ title: '已取消', icon: 'success' }); loadAll() } catch (_) {} }
                    }})
                  }}>取消</View>
                </View>
              )}
            </View>
          ))
        )
      ) : (
        historyGroups.length === 0 ? (
          <View className='empty-state'>
            <Text className='empty-icon'>📭</Text>
            <Text className='empty-sub'>暂无已完成订单</Text>
          </View>
        ) : (
          historyGroups.map(group => (
            <View key={group.date}>
              <View className='date-header'>{group.date}</View>
              {(group.buildings || []).map(bg => (
                <View key={bg.building}>
                  <View className='building-sub-header'>{bg.building} · {bg.count}单</View>
                  {bg.orders.map(order => (
                    <View key={order.id} className='card'>
                      <View className='order-header'>
                        <Text className='order-no'>#{order.orderNo}</Text>
                        <Text className={`status-tag status-${order.status}`}>
                          {getStatusText(order.status)}
                        </Text>
                      </View>
                      <View className='order-body'>
                        <Text>{order.station} → {order.building}{order.room ? ` ${order.room}室` : ''}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ))
        )
      )}
    </View>
  )
}
