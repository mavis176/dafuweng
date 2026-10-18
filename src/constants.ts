import { Property, ItemId, GameItem, AncientEventCard } from './types';

export const BOARD_SIZE = 24;

// 原版现代地图（完全保留，原样不改动）
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

// 新增古风市井地图：当铺、商行、驿站、钱庄、客栈、良田、书院、庙会
export const ANCIENT_BOARD_DATA: Property[] = [
  { id: 0, name: '长安府门', type: 'start', price: 0, rent: 0, houseLevel: 0 },
  { id: 1, name: '临街商行', type: 'ancient_shop', price: 0, rent: 0, houseLevel: 0 },
  { id: 2, name: '悦来客栈', type: 'dessert', price: 150, rent: 30, houseLevel: 0 },
  { id: 3, name: '庙会奇遇', type: 'chance', price: 0, rent: 0, houseLevel: 0 },
  { id: 4, name: '京畿良田', type: 'farm', price: 200, rent: 40, houseLevel: 0 },
  { id: 5, name: '闲置空舍甲', type: 'empty', price: 80, rent: 15, houseLevel: 0 },
  { id: 6, name: '户部税司', type: 'tax', price: 0, rent: 0, houseLevel: 0 },
  { id: 7, name: '岳麓书院', type: 'bookstore', price: 240, rent: 50, houseLevel: 0 },
  { id: 8, name: '汇通钱庄', type: 'shop', price: 120, rent: 25, houseLevel: 0 },
  { id: 9, name: '杏花酒肆', type: 'dessert', price: 280, rent: 60, houseLevel: 0 },
  { id: 10, name: '闲置空舍乙', type: 'empty', price: 90, rent: 18, houseLevel: 0 },
  { id: 11, name: '庙会奇遇', type: 'chance', price: 0, rent: 0, houseLevel: 0 },
  { id: 12, name: '十里驿站', type: 'park', price: 0, rent: 0, houseLevel: 0 },
  { id: 13, name: '桑蚕茶庄', type: 'farm', price: 220, rent: 45, houseLevel: 0 },
  { id: 14, name: '四海当铺', type: 'pawn', price: 0, rent: 0, houseLevel: 0 },
  { id: 15, name: '御前商行', type: 'ancient_shop', price: 0, rent: 0, houseLevel: 0 },
  { id: 16, name: '庙会奇遇', type: 'chance', price: 0, rent: 0, houseLevel: 0 },
  { id: 17, name: '万卷书斋', type: 'bookstore', price: 260, rent: 55, houseLevel: 0 },
  { id: 18, name: '县衙考税', type: 'tax', price: 0, rent: 0, houseLevel: 0 },
  { id: 19, name: '闲置空舍丙', type: 'empty', price: 110, rent: 22, houseLevel: 0 },
  { id: 20, name: '醉仙楼阁', type: 'dessert', price: 300, rent: 65, houseLevel: 0 },
  { id: 21, name: '清心别苑', type: 'park', price: 160, rent: 32, houseLevel: 0 },
  { id: 22, name: '庙会奇遇', type: 'chance', price: 0, rent: 0, houseLevel: 0 },
  { id: 23, name: '稻香农庄', type: 'farm', price: 240, rent: 50, houseLevel: 0 },
];

export interface ChanceCard {
  title: string;
  desc: string;
  type: 'gain' | 'loss' | 'neutral' | 'jail' | 'bail';
  amount: number;
  jailTurns?: number;
}

export const CHANCE_CARDS: ChanceCard[] = [
  { title: '官府赏赐银两', desc: '积极参与社区商业互助荣获殊荣，官府赏赐银两，获得 200！', type: 'gain', amount: 200 },
  { title: '被捕入狱', desc: '涉嫌严重违章经营被执法查处，你被捕入狱，停留 2 回合！', type: 'jail', amount: 0, jailTurns: 2 },
  { title: '律师保释', desc: '辩护律师出具证据申请取保成功，获得保释出狱，退还保释金 50！', type: 'bail', amount: 50 },
  { title: '违规停单车', desc: '自行车乱停在路口被物业警告，缴纳管理罚款 40 金币。', type: 'loss', amount: -40 },
  { title: '零花钱奖赏', desc: '在旧衣服口袋里翻出零花钱，开心获得 80 金币！', type: 'gain', amount: 80 },
  { title: '花园丰收', desc: '自家花园小番茄大丰收，摆摊售出获得 100 金币！', type: 'gain', amount: 100 },
  { title: '市政交管罚款', desc: '未按规定路线通行收到交通违章罚单，缴纳罚款 60 金币。', type: 'loss', amount: -60 },
  { title: '假日漫步', desc: '在小公园的大草坪上免费晒太阳休息，身心舒畅。', type: 'neutral', amount: 0 },
  { title: '文明家庭奖', desc: '荣获街道办“文明互助家庭”光荣称号，获得奖金 120 金币！', type: 'gain', amount: 120 },
];

export const ANCIENT_CHANCE_CARDS: ChanceCard[] = [
  { title: '官府赏赐银两', desc: '捐资修桥铺路义举感佩州府，官府赏赐银两，获得 200！', type: 'gain', amount: 200 },
  { title: '被捕入狱', desc: '私开地下赌场被差役当场缉拿，你被捕入狱，收监停留 2 回合！', type: 'jail', amount: 0, jailTurns: 2 },
  { title: '乡绅保释', desc: '名望乡绅出面具保悔过，获得官府恩准保释，发还 50 银两！', type: 'bail', amount: 50 },
  { title: '街巷拾遗', desc: '在朱雀大街青石板下捡到碎银包，喜得 80 银两！', type: 'gain', amount: 80 },
  { title: '庄稼丰稔', desc: '庄田黍麦大丰收，运至市集售出获利 100 银两！', type: 'gain', amount: 100 },
  { title: '城防规费罚银', desc: '商货通关未按规制申报账册，缴纳违规罚款 60 银两。', type: 'loss', amount: -60 },
  { title: '酒肆宴请', desc: '邀约诸位挚友在杏花酒肆共饮品春酒，开销 50 银两。', type: 'loss', amount: -50 },
  { title: '积善之家', desc: '州府嘉奖乐善好施商号，赐予花红文银 120 银两！', type: 'gain', amount: 120 },
];

// 古风特色专属事件库（驿站、书院、庙会）
export const ANCIENT_EVENTS: {
  post: AncientEventCard[]; // 驿站
  academy: AncientEventCard[]; // 书院
  fair: AncientEventCard[]; // 庙会
} = {
  post: [
    {
      title: '加急驿丞相赠',
      source: '驿站',
      desc: '在十里驿站与八百里加急军官对饮甚欢，驿官佩服阁下豪迈，奉赠官府特许【路引】一份！',
      type: 'item',
      itemId: 'road_pass',
      itemName: '路引',
    },
    {
      title: '避雨结识神医',
      source: '驿站',
      desc: '在驿站偶遇云游神医并以姜汤相待，神医赠予辟邪护身【免罪符】一枚，免灾延年！',
      type: 'item',
      itemId: 'pardon_talisman',
      itemName: '免罪符',
    },
    {
      title: '搭救西域商贾',
      source: '驿站',
      desc: '为驿站中风沙迷途的西域客商解围，商人赠予随身至宝【定风转运珠】与酬银 50 两！',
      type: 'item',
      amount: 50,
      itemId: 'lucky_bead',
      itemName: '定风转运珠',
    },
    {
      title: '驿马整装备鞍',
      source: '驿站',
      desc: '驿馆良驹长途跋涉需添饲换蹄铁，支付车马客栈杂银 30 两。',
      type: 'loss',
      amount: -30,
    },
    {
      title: '驿馆烹茶小憩',
      source: '驿站',
      desc: '在十里驿站古柳下烹泉煮茗，身心通泰，静看车马往来。',
      type: 'neutral',
      amount: 0,
    },
  ],
  academy: [
    {
      title: '诗会夺魁夺赏',
      source: '书院',
      desc: '在书院中秋文会上以妙句技压四座，掌教亲赐朝廷【置地契书】一张并赏银 80 两！',
      type: 'item',
      amount: 80,
      itemId: 'land_deed',
      itemName: '置地契书',
    },
    {
      title: '辩经夺魁天下知',
      source: '书院',
      desc: '同诸生辩论商道治世之学大获全胜，在场学士纷纷赞叹，合赠贺礼银两 100 两！',
      type: 'gain',
      amount: 100,
    },
    {
      title: '借阅文渊善本',
      source: '书院',
      desc: '蒙掌书恩准借阅珍藏古籍拓本研读，交付书院修缮装裱纸墨银 40 两。',
      type: 'loss',
      amount: -40,
    },
    {
      title: '大儒亲题保身符',
      source: '书院',
      desc: '书院山长大儒感佩阁下仁厚济世，亲笔书写浩然正气【免罪符】相赠！',
      type: 'item',
      itemId: 'pardon_talisman',
      itemName: '免罪符',
    },
    {
      title: '同窗赠送赶考引',
      source: '书院',
      desc: '金榜题名的同窗挚友行前将官家通行【路引】转赠于你！',
      type: 'item',
      itemId: 'road_pass',
      itemName: '路引',
    },
  ],
  fair: [
    {
      title: '套圈巧夺彩头',
      source: '庙会',
      desc: '在长安上元灯市庙会套中绝品宝匣，喜得【定风转运珠】一枚与花红银 80 两！',
      type: 'item',
      amount: 80,
      itemId: 'lucky_bead',
      itemName: '定风转运珠',
    },
    {
      title: '破灯谜摘龙头',
      source: '庙会',
      desc: '连破连中一十二盏龙凤花灯灯谜，摘得庙会状元花红白银 120 两！',
      type: 'gain',
      amount: 120,
    },
    {
      title: '云游道长赠仙符',
      source: '庙会',
      desc: '庙会古石桥边偶遇得道仙长，赠予护体【免罪符】避祸除灾！',
      type: 'item',
      itemId: 'pardon_talisman',
      itemName: '免罪符',
    },
    {
      title: '庙会仗义相助',
      source: '庙会',
      desc: '在庙会义助走失的富商幼子寻回家人，员外万分感激，奉送【置地契书】一张！',
      type: 'item',
      itemId: 'land_deed',
      itemName: '置地契书',
    },
    {
      title: '全家进香祈福',
      source: '庙会',
      desc: '登古刹祈求阖家兴旺、财源广进，虔诚捐纳功德香火银两 50 两。',
      type: 'loss',
      amount: -50,
    },
    {
      title: '打赏杂耍傩戏',
      source: '庙会',
      desc: '驻足观看西域幻戏与喷火杂耍大呼过瘾，打赏班主碎银 20 两。',
      type: 'loss',
      amount: -20,
    },
  ],
};

// 游戏道具定义库
export const GAME_ITEMS: Record<ItemId, GameItem> = {
  road_pass: {
    id: 'road_pass',
    name: '路引',
    tag: '自选步数',
    icon: '📜',
    desc: '官府特许通行路引：本次掷骰直接自选指定点数 (2~12点)，随心定点直达心仪地块！',
    price: 120,
    sellPrice: 80,
  },
  pardon_talisman: {
    id: 'pardon_talisman',
    name: '免罪符',
    tag: '免罚免租',
    icon: '🛡️',
    desc: '辟邪免罚保身符：停留在税司免纳赋税，或途经他人领地免付一次高昂过路租金！',
    price: 150,
    sellPrice: 100,
  },
  land_deed: {
    id: 'land_deed',
    name: '置地契书',
    tag: '开荒半价',
    icon: '📑',
    desc: '朝廷开荒特许契书：下次购置无主地皮或加建房屋立享 5 折半价特惠！',
    price: 100,
    sellPrice: 70,
  },
  lucky_bead: {
    id: 'lucky_bead',
    name: '定风转运珠',
    tag: '立得文银',
    icon: '🔮',
    desc: '蕴含天地灵气的祥瑞灵珠：使用后立刻受财神庇护，开怀获得 150 银两进账！',
    price: 90,
    sellPrice: 60,
  },
};
