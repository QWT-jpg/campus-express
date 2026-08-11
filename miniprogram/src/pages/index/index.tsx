import { useState, useEffect, useMemo } from 'react'
import { View, Text, Input, Button } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { createOrder } from '../../utils/api'
import { API_BASE_URL } from '../../config'
import './index.scss'

// Default building groups (fallback if config fails)
const defaultBuildings = ['西区1号楼', '西区2号楼', '西区3号楼', '西区4号楼', '西区5号楼', '西区6号楼', '西区7号楼', '东区1号楼', '东区2号楼', '东区3号楼', '东区4号楼', '东区5号楼', '东区6号楼', '东区7号楼', '东区8号楼', '东区9号楼']

function buildDistrictGroups(buildings: string[]) {
  const map: Record<string, string[]> = {}
  for (const b of buildings) {
    // Try to extract district prefix: "西区1号楼" -> "西区", "1号楼"
    const match = b.match(/^(.+?区)(.+)$/)
    const district = match ? match[1] : '其他'
    const name = match ? match[2] : b
    if (!map[district]) map[district] = []
    map[district].push(name)
  }
  return Object.entries(map).map(([name, builds]) => ({ name, buildings: builds }))
}

export default function Index() {
  const [stations, setStations] = useState<string[]>([])
  const [station, setStation] = useState('')
  const [expandedDistricts, setExpandedDistricts] = useState<Record<string, boolean>>({})
  const [building, setBuilding] = useState('')
  const [districtGroups, setDistrictGroups] = useState<{name:string, buildings:string[]}[]>(buildDistrictGroups(defaultBuildings))
  const [room, setRoom] = useState('')
  const [storeOrder, setStoreOrder] = useState('')
  const [pickCode, setPickCode] = useState('')
  const [packageType, setPackageType] = useState('')
  const [senderPhone, setSenderPhone] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [annExpanded, setAnnExpanded] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadConfig() }, [])

  usePullDownRefresh(() => {
    loadConfig()
    Taro.stopPullDownRefresh()
  })

  const loadConfig = async () => {
    try {
      const res = await Taro.request({
        url: `${API_BASE_URL}/config`,
        method: 'GET',
        header: { 'ngrok-skip-browser-warning': '1' },
      })
      if (res.data?.code === 0) {
        const d = res.data.data
        setStations(d.stations || [])
        setAnnouncement(d.announcement || '')
        const blds = d.buildings || []
        if (blds.length) setDistrictGroups(buildDistrictGroups(blds))
      }
    } catch (_) { setStations(['校内驿站', '校外驿站']) }
  }

  const goToShop = () => {
    Taro.navigateToMiniProgram({
      appId: 'wx065157f19be4e85d',
      path: '',
      fail: () => Taro.showToast({ title: '跳转失败，请确认已添加该小程序', icon: 'none' }),
    })
  }

  const toggleDistrict = (name: string) => {
    setExpandedDistricts(prev => ({ ...prev, [name]: !prev[name] }))
  }

  const handleSubmit = async () => {
    if (!station) return Taro.showToast({ title: '请选择驿站', icon: 'none' })
    if (!building) return Taro.showToast({ title: '请选择楼栋', icon: 'none' })
    if (!storeOrder.trim()) return Taro.showToast({ title: '请填写店铺订单号', icon: 'none' })
    if (!pickCode.trim()) return Taro.showToast({ title: '请填写取件码', icon: 'none' })
    if (!packageType) return Taro.showToast({ title: '请选择包裹类型', icon: 'none' })

    setSubmitting(true)
    try {
      await createOrder({ station, building, room: room || undefined, storeOrder: storeOrder.trim(), pickCode: pickCode.trim(), packageType: packageType || undefined, senderPhone: senderPhone || undefined })
      Taro.showToast({ title: '提交成功', icon: 'success' })
      setRoom(''); setStoreOrder(''); setPickCode(''); setPackageType(''); setSenderPhone(''); setBuilding('')
    } catch (_) {} finally { setSubmitting(false) }
  }

  return (
    <View className='container'>
      {announcement && (
        <View>
          <View className={`announcement-bar ${annExpanded ? 'expanded' : ''}`} onClick={() => setAnnExpanded(!annExpanded)}>
            {announcement}
          </View>
          <View className='announcement-toggle' onClick={() => setAnnExpanded(!annExpanded)}>
            {annExpanded ? '收起 ▲' : '展开全文 ▼'}
          </View>
        </View>
      )}

      <View className='card'>
        <View className='form-item'>
          <Text className='form-label'>驿站 *</Text>
          <View className='radio-group'>
            {stations.map(s => (
              <View key={s} className={`radio-item ${station === s ? 'active' : ''}`} onClick={() => setStation(s)}>
                {s}
              </View>
            ))}
          </View>
        </View>

        <View className='form-item'>
          <Text className='form-label'>楼栋 *</Text>
          {districtGroups.map(group => (
            <View key={group.name} className='district-group'>
              <View className='district-toggle' onClick={() => toggleDistrict(group.name)}>
                <Text className='district-name'>{group.name}</Text>
                <Text className='district-arrow'>{expandedDistricts[group.name] ? '▾' : '▸'}</Text>
              </View>
              {expandedDistricts[group.name] && (
                <View className='building-grid'>
                  {group.buildings.map(b => (
                    <View key={b} className={`building-item ${building === `${group.name}${b}` ? 'active' : ''}`} onClick={() => setBuilding(`${group.name}${b}`)}>
                      {b}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        <View className='form-item'>
          <Text className='form-label'>房间号（选填）</Text>
          <Input className='form-input' placeholder='如：502' value={room} onInput={e => setRoom(e.detail.value)} />
        </View>

        <View className='form-item'>
          <Text className='form-label'>店铺订单号 *</Text>
          <Input className='form-input' placeholder='付款后复制店铺订单号' value={storeOrder} maxlength={50} onInput={e => setStoreOrder(e.detail.value)} />
          <View className='shop-hint' onClick={goToShop}>📎 还没付款？去店铺下单</View>
        </View>

        <View className='form-item'>
          <Text className='form-label'>取件码 *</Text>
          <Input className='form-input' placeholder='如：3-5018' value={pickCode} maxlength={20} onInput={e => setPickCode(e.detail.value)} />
        </View>

        <View className='form-item'>
          <Text className='form-label'>包裹类型 *</Text>
          <View className='radio-group'>
            {['小件', '中件', '大件'].map(t => (
              <View key={t} className={`radio-item ${packageType === t ? 'active' : ''}`} onClick={() => setPackageType(packageType === t ? '' : t)}>
                {t}
              </View>
            ))}
          </View>
        </View>

        <View className='form-item'>
          <Text className='form-label'>联系电话（选填）</Text>
          <Input className='form-input' placeholder='方便联系您' maxlength={11} value={senderPhone} onInput={e => { const v = e.detail.value.replace(/\D/g, ''); setSenderPhone(v) }} />
        </View>

        <Button className='btn-primary' onClick={handleSubmit} loading={submitting} disabled={submitting}>
          提交
        </Button>
      </View>
    </View>
  )
}
