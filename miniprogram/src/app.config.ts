export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/order/order',
    'pages/profile/profile',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#10B981',
    navigationBarTitleText: '校园快递代拿',
    navigationBarTextStyle: 'white',
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#10B981',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
      },
      {
        pagePath: 'pages/order/order',
        text: '订单',
      },
      {
        pagePath: 'pages/profile/profile',
        text: '我的',
      },
    ],
  },
})
