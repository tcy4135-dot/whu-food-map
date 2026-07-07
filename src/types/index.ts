// ===== 美食街标识 =====
export type StreetId = 'guangbalu' | 'bayilu' | 'donghuxincun' | 'luoshibeilu' | 'weilaicheng' | 'xiaonei';

// ===== 菜系分类 =====
export type CuisineCategory =
  | '中餐'
  | '火锅'
  | '小吃'
  | '烧烤'
  | '面食'
  | '日料'
  | '韩料'
  | '西餐'
  | '甜品饮品'
  | '新疆菜'
  | '川菜'
  | '鲁菜'
  | '湖北菜'
  | '东北菜'
  | '西北菜'
  | '快餐'
  | '其他';

// ===== 美食街信息 =====
export interface Street {
  id: StreetId;
  name: string;
  description: string;
  centerLatLng: [number, number];
  color: string;
}

// ===== 店铺信息 =====
export interface Restaurant {
  id: string;
  name: string;
  streetId: StreetId;
  cuisine: CuisineCategory;
  signatureDish: string;
  avgPrice: number;
  description: string;
  latLng: [number, number];
  tags?: string[];
}

// ===== 筛选状态 =====
export interface FilterState {
  selectedStreet: StreetId | 'all';
  selectedCuisine: CuisineCategory | 'all';
  sortBy: 'default' | 'price-asc' | 'price-desc';
  searchKeyword: string;
}

// ===== 地图视图状态 =====
export interface MapViewState {
  center: [number, number];
  zoom: number;
  activeRestaurantId: string | null;
}
