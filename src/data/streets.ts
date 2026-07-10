import type { Street } from '../types';

export const streets: Street[] = [
  // ============================================================
  // 校内学部
  // ============================================================
  {
    id: 'wenli',
    name: '文理学部',
    description: '包含枫园、梅园、湖滨、桂园四个生活圈，是武大主校区核心区域',
    centerLatLng: [30.537, 114.366],
    color: '#A8C8A0',
  },
  {
    id: 'gongxue',
    name: '工学部',
    description: '工学部各食堂及东湖南路沿线',
    centerLatLng: [30.541, 114.360],
    color: '#E8A87C',
  },
  {
    id: 'xinxi',
    name: '信息学部',
    description: '信息学部及南门周边',
    centerLatLng: [30.530, 114.357],
    color: '#D4A0D4',
  },
  // ============================================================
  // 校外美食街
  // ============================================================
  {
    id: 'guangba',
    name: '广八路',
    description: '广八路沿线美食街，烟火气十足',
    centerLatLng: [30.531, 114.358],
    color: '#F5C6A0',
  },
  {
    id: 'bayi',
    name: '八一路',
    description: '八一路沿线美食，从快餐到正餐应有尽有',
    centerLatLng: [30.537, 114.365],
    color: '#A8D8B8',
  },
  {
    id: 'donghu',
    name: '东湖新村',
    description: '东湖新村区域，隐藏不少本地美食',
    centerLatLng: [30.546, 114.370],
    color: '#B8C8E8',
  },
  {
    id: 'luoshi',
    name: '珞狮北路',
    description: '珞狮北路沿线，川湘风味浓厚',
    centerLatLng: [30.539, 114.351],
    color: '#E8C8A0',
  },
  {
    id: 'weilai',
    name: '未来城夜市',
    description: '未来城夜市区域，营业到凌晨',
    centerLatLng: [30.525, 114.356],
    color: '#D4B8A0',
  },
];
