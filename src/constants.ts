import { Property } from './types';

export const BOARD_SIZE = 24;

export const BOARD_DATA: Property[] = [
  { id: 0, name: '起点', type: 'start', price: 0, rent: 0, houseLevel: 0 },
  { id: 1, name: '小超市', type: 'shop', price: 100, rent: 20, houseLevel: 0 },
  { id: 2, name: '小公园', type: 'park', price: 150, rent: 30, houseLevel: 0 },
  { id: 3, name: '机会卡', type: 'chance', price: 0, rent: 0, houseLevel: 0 },
  { id: 4, name: '小农场', type: 'farm', price: 200, rent: 40, houseLevel: 0 },
  { id: 5, name: '空地A', type: 'empty', price: 80, rent: 15, houseLevel: 0 },
  { id: 6, name: '税务局', type: 'tax', price: 0, rent: 0, houseLevel: 0 },
  { id: 7, name: '书屋', type: 'bookstore', price: 240, rent: 50, houseLevel: 0 },
  { id: 8, name: '小超市', type: 'shop', price: 120, rent: 25, houseLevel: 0 },
  { id: 9, name: '甜品店', type: 'dessert', price: 280, rent: 60, houseLevel: 0 },
  { id: 10, name: '空地B', type: 'empty', price: 90, rent: 18, houseLevel: 0 },
  { id: 11, name: '机会卡', type: 'chance', price: 0, rent: 0, houseLevel: 0 },
  { id: 12, name: '公园休息', type: 'park', price: 0, rent: 0, houseLevel: 0 },
  { id: 13, name: '小农场', type: 'farm', price: 220, rent: 45, houseLevel: 0 },
  { id: 14, name: '空地C', type: 'empty', price: 100, rent: 20, houseLevel: 0 },
  { id: 15, name: '小超市', type: 'shop', price: 130, rent: 28, houseLevel: 0 },
  { id: 16, name: '机会卡', type: 'chance', price: 0, rent: 0, houseLevel: 0 },
  { id: 17, name: '书屋', type: 'bookstore', price: 260, rent: 55, houseLevel: 0 },
  { id: 18, name: '税务局', type: 'tax', price: 0, rent: 0, houseLevel: 0 },
  { id: 19, name: '空地D', type: 'empty', price: 110, rent: 22, houseLevel: 0 },
  { id: 20, name: '甜品店', type: 'dessert', price: 300, rent: 65, houseLevel: 0 },
  { id: 21, name: '小公园', type: 'park', price: 160, rent: 32, houseLevel: 0 },
  { id: 22, name: '机会卡', type: 'chance', price: 0, rent: 0, houseLevel: 0 },
  { id: 23, name: '小农场', type: 'farm', price: 240, rent: 50, houseLevel: 0 },
];

export interface ChanceCard {
  title: string;
  desc: string;
  type: 'gain' | 'loss' | 'neutral';
  amount: number;
}

export const CHANCE_CARDS: ChanceCard[] = [
  { title: '零花钱奖赏', desc: '在旧衣服口袋里翻出零花钱，开心获得 80 金币！', type: 'gain', amount: 80 },
  { title: '花园丰收', desc: '自家花园小番茄大丰收，摆摊售出获得 100 金币！', type: 'gain', amount: 100 },
  { title: '助人为乐', desc: '帮隔壁王阿姨修剪草坪与浇花，获得报酬 60 金币！', type: 'gain', amount: 60 },
  { title: '违规停单车', desc: '自行车乱停在路口被物业警告，缴纳管理费 40 金币。', type: 'loss', amount: -40 },
  { title: '全家甜品日', desc: '请全家人一起喝下午茶与冰淇淋，花费 50 金币。', type: 'loss', amount: -50 },
  { title: '假日漫步', desc: '在小公园的大草坪上免费晒太阳休息，身心舒畅。', type: 'neutral', amount: 0 },
  { title: '文明家庭奖', desc: '荣获街道办“文明互助家庭”光荣称号，获得奖金 120 金币！', type: 'gain', amount: 120 },
  { title: '书香门第', desc: '在社区二手书市淘到绝版绘本并转赠，获得鼓励奖 50 金币！', type: 'gain', amount: 50 },
];
