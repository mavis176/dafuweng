import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Player,
  GameState,
  Property,
  BuildModalState,
  AiNoticeModalState,
  RentModalState,
  ShopModalState,
  PawnModalState,
  BackpackModalState,
  ConfirmUseItemModalState,
  RoadPassModalState,
  AncientEventModalState,
  AncientEventCard,
  GameEventModalState,
  GameRoom,
  GameMode,
  MapTheme,
  ItemId,
  LogCategory,
  GameLog,
} from '../types';
import {
  BOARD_DATA,
  ANCIENT_BOARD_DATA,
  CHANCE_CARDS,
  ANCIENT_CHANCE_CARDS,
  ANCIENT_EVENTS,
  GAME_ITEMS,
  ChanceCard,
} from '../constants';
import { soundManager } from '../utils/audio';

let logCounter = 0;
export const createLog = (category: LogCategory, text: string): GameLog => {
  logCounter += 1;
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  return {
    id: `log-${Date.now()}-${logCounter}`,
    category,
    text,
    timestamp: timeStr,
  };
};

export const useGameEngine = (canRunAi: boolean = true) => {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayerIndex: 0,
    board: BOARD_DATA,
    logs: [createLog('系统', '欢迎来到【家庭大富翁】！请选择地图与模式开局。')],
    isGameOver: false,
    round: 1,
    maxRounds: 15,
    gameMode: 'ROUNDS',
    mapTheme: 'MODERN',
    isMovingPawn: false,
  });

  const [isSetup, setIsSetup] = useState(true);

  // Dice Modal state
  const [showDiceModal, setShowDiceModal] = useState<{
    show: boolean;
    dice: [number, number] | null;
    isRolling: boolean;
  }>({ show: false, dice: null, isRolling: false });

  // Chance Card notification banner / modal
  const [activeChanceCard, setActiveChanceCard] = useState<ChanceCard | null>(null);

  // Ancient Event Modal state (古风特色事件：驿站、书院、庙会)
  const [ancientEventModal, setAncientEventModal] = useState<AncientEventModalState>({
    show: false,
    card: null,
    playerName: '',
  });

  // Human House Build Confirmation Modal state
  const [buildModal, setBuildModal] = useState<BuildModalState>({
    show: false,
    property: null,
    propertyIndex: -1,
    cost: 100,
    nextLevel: 1,
    nextLevelName: '第 1 栋房屋',
  });

  // AI Action Result Notice Modal state
  const [aiNoticeModal, setAiNoticeModal] = useState<AiNoticeModalState>({
    show: false,
    aiName: '',
    actionText: '',
    detailText: '',
    isBuild: false,
  });

  // Rent Settlement Modal state
  const [rentModal, setRentModal] = useState<RentModalState>({
    show: false,
    payerName: '',
    receiverName: '',
    amount: 0,
    propertyName: '',
    houseLevel: 0,
  });

  // Ancient Shop Modal state (商行采买)
  const [shopModal, setShopModal] = useState<ShopModalState>({
    show: false,
    playerIndex: 0,
    squareName: '临街商行',
  });

  // Ancient Pawnshop Modal state (当铺典当/抵押/赎回)
  const [pawnModal, setPawnModal] = useState<PawnModalState>({
    show: false,
    playerIndex: 0,
    squareName: '四海当铺',
    activeTab: 'ITEMS',
  });

  // Backpack Modal state (玩家随身锦囊背包)
  const [backpackModal, setBackpackModal] = useState<BackpackModalState>({
    show: false,
    playerIndex: 0,
  });

  // Confirm Use Item Modal state (二次确认弹窗)
  const [confirmUseItemModal, setConfirmUseItemModal] = useState<ConfirmUseItemModalState>({
    show: false,
    item: null,
  });

  // Road Pass Dice Selection Modal state (路引自选点数)
  const [roadPassModal, setRoadPassModal] = useState<RoadPassModalState>({
    show: false,
    playerIndex: 0,
  });

  // Game Event Notice Modal state (机会卡/入狱/保释/罚款/奖励银两弹窗)
  const [gameEventModal, setGameEventModal] = useState<GameEventModalState>({
    show: false,
    eventType: 'chance',
    title: '',
    badge: '',
    icon: '✨',
    highlightText: '',
    details: '',
    playerName: '',
    isAI: false,
    onConfirmAdvance: false,
  });

  // Turn processing lock to prevent double-rolls or race conditions
  const isTurnProcessingRef = useRef(false);
  const movementTimerRef = useRef<NodeJS.Timeout | null>(null);
  const aiTimerRef = useRef<NodeJS.Timeout | null>(null);

  const colors = ['#E53935', '#1E88E5', '#2E7D32', '#8E24AA'];
  const avatars = ['👨‍👩‍👧', '👦', '👧', '🤖'];

  const setupGame = (
    playerConfigs: { name: string; isAI: boolean }[],
    rounds = 15,
    mode: GameMode = 'ROUNDS',
    mapTheme: MapTheme = 'MODERN'
  ) => {
    if (movementTimerRef.current) {
      clearInterval(movementTimerRef.current);
      movementTimerRef.current = null;
    }
    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }

    const players: Player[] = playerConfigs.map((cfg, i) => ({
      id: i,
      name: cfg.name.trim() || (cfg.isAI ? `智能伙伴 ${i + 1}` : `玩家 ${i + 1}`),
      money: 1000,
      position: 0,
      properties: [],
      isAI: cfg.isAI,
      color: colors[i % colors.length],
      avatarIcon: cfg.isAI ? '🤖' : avatars[i % avatars.length],
      loans: 0,
      isBankrupt: false,
      items: [],
      activeDiscount: false,
      activeImmunity: false,
    }));

    const sourceBoard = mapTheme === 'ANCIENT' ? ANCIENT_BOARD_DATA : BOARD_DATA;
    const cleanBoard = sourceBoard.map((sq) => ({
      ...sq,
      owner: undefined,
      houseLevel: 0,
      isMortgaged: false,
      mortgageAmount: undefined,
    }));

    const startMsg =
      mapTheme === 'ANCIENT'
        ? `🎉 盛世启幕！置身【古风市井地图】，${
            mode === 'ROUNDS' ? `【轮数争霸 (${rounds}轮)】` : '【破产淘汰模式】'
          }。诸位掌柜各领千两本金，第 1 位东家请投掷骨骰！`
        : `🎉 游戏正式开局！地图：【现代乐园地图】，模式：${
            mode === 'ROUNDS' ? `【轮数争霸 (${rounds}轮)】` : '【破产淘汰模式】'
          }。第 1 位玩家准备掷骰！`;

    setGameState({
      players,
      currentPlayerIndex: 0,
      board: cleanBoard,
      logs: [createLog('系统', startMsg)],
      isGameOver: false,
      round: 1,
      maxRounds: rounds,
      gameMode: mode,
      mapTheme,
      isMovingPawn: false,
    });
    setIsSetup(false);
    isTurnProcessingRef.current = false;
  };

  const resetToSetup = () => {
    if (movementTimerRef.current) {
      clearInterval(movementTimerRef.current);
      movementTimerRef.current = null;
    }
    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    setIsSetup(true);
    setShowDiceModal({ show: false, dice: null, isRolling: false });
    setActiveChanceCard(null);
    setAncientEventModal({ show: false, card: null, playerName: '' });
    setBuildModal({
      show: false,
      property: null,
      propertyIndex: -1,
      cost: 100,
      nextLevel: 1,
      nextLevelName: '',
    });
    setAiNoticeModal({
      show: false,
      aiName: '',
      actionText: '',
      detailText: '',
      isBuild: false,
    });
    setRentModal({
      show: false,
      payerName: '',
      receiverName: '',
      amount: 0,
      propertyName: '',
      houseLevel: 0,
      isBankrupt: false,
    });
    setShopModal({ show: false, playerIndex: 0, squareName: '' });
    setPawnModal({ show: false, playerIndex: 0, squareName: '', activeTab: 'ITEMS' });
    setBackpackModal({ show: false, playerIndex: 0 });
    setConfirmUseItemModal({ show: false, item: null });
    setRoadPassModal({ show: false, playerIndex: 0 });
    setGameEventModal({
      show: false,
      eventType: 'chance',
      title: '',
      badge: '',
      icon: '✨',
      highlightText: '',
      details: '',
      playerName: '',
      isAI: false,
      onConfirmAdvance: false,
    });
    isTurnProcessingRef.current = false;
  };

  // Helper: check bankruptcy and grant soft relief (in Rounds mode)
  const checkAndApplyLoan = (
    player: Player,
    newLogs: GameLog[],
    mode: GameMode,
    isAncient: boolean
  ): Player => {
    if (mode === 'ROUNDS' && player.money <= 0) {
      const loanAmount = 300;
      const bankTitle = isAncient ? '🏦【通宝钱庄】' : '🏦【爱心银行】';
      const unit = isAncient ? '银两' : '金币';
      newLogs.unshift(
        createLog(
          '事件',
          `${bankTitle}${player.name} 资金耗尽，钱庄/银行发放 ${loanAmount} ${unit}免息扶持基金，鼓励继续游玩！`
        )
      );
      return {
        ...player,
        money: player.money + loanAmount,
        loans: player.loans + 1,
      };
    }
    return player;
  };

  // Pure state helper to advance turn to next active (non-bankrupt) player atomically
  const computeNextTurnState = useCallback(
    (
      prev: GameState,
      currentPlayers: Player[],
      currentBoard: Property[],
      prevLogs: GameLog[],
      fromPlayerIndex: number
    ): GameState => {
      const newLogs = [...prevLogs];
      const mode = prev.gameMode;
      const currentRound = prev.round;
      const maxRounds = prev.maxRounds;

      isTurnProcessingRef.current = false;

      // Check Bankruptcy mode game-over condition
      if (mode === 'BANKRUPTCY') {
        const survivingPlayers = currentPlayers.filter((p) => !p.isBankrupt);
        if (survivingPlayers.length <= 1) {
          const winner = survivingPlayers[0] || currentPlayers[0];
          newLogs.unshift(
            createLog(
              '系统',
              `🏆 游戏决胜结束！唯一幸存玩家【${winner.name}】荣登首富宝座，傲视商海！`
            )
          );
          soundManager.playGameOver();
          return {
            ...prev,
            players: currentPlayers,
            board: currentBoard,
            logs: newLogs.slice(0, 30),
            isGameOver: true,
            winner,
            isMovingPawn: false,
          };
        }
      }

      // Find next player index who is not bankrupt
      const numPlayers = currentPlayers.length;
      let nextIndex = (fromPlayerIndex + 1) % numPlayers;
      let loopedCount = 0;

      while (currentPlayers[nextIndex]?.isBankrupt && loopedCount < numPlayers) {
        nextIndex = (nextIndex + 1) % numPlayers;
        loopedCount += 1;
      }

      // Check if a full round has cycled
      let nextRound = currentRound;
      if (nextIndex <= fromPlayerIndex) {
        nextRound += 1;
      }

      // Check Custom Rounds mode game-over condition
      if (mode === 'ROUNDS' && nextRound > maxRounds) {
        const sorted = [...currentPlayers].sort((a, b) => {
          const aTotal =
            a.money +
            a.properties.reduce((sum, pid) => {
              const p = currentBoard[pid];
              return (
                sum +
                (p ? (p.isMortgaged ? Math.floor(p.price * 0.4) : p.price + p.houseLevel * 100) : 0)
              );
            }, 0);
          const bTotal =
            b.money +
            b.properties.reduce((sum, pid) => {
              const p = currentBoard[pid];
              return (
                sum +
                (p ? (p.isMortgaged ? Math.floor(p.price * 0.4) : p.price + p.houseLevel * 100) : 0)
              );
            }, 0);
          return bTotal - aTotal;
        });

        const overallWinner = sorted[0];
        newLogs.unshift(
          createLog(
            '系统',
            `🏁 【${maxRounds}轮争霸】全部轮次结束！获胜冠军是【${overallWinner.name}】！`
          )
        );
        soundManager.playGameOver();

        return {
          ...prev,
          players: currentPlayers,
          board: currentBoard,
          logs: newLogs.slice(0, 30),
          isGameOver: true,
          winner: overallWinner,
          isMovingPawn: false,
        };
      }

      const nextPlayer = currentPlayers[nextIndex];
      newLogs.unshift(
        createLog(
          '系统',
          `🔄 轮到第 ${nextIndex + 1} 位东家/玩家【${nextPlayer.name}】(${nextPlayer.avatarIcon}) 行动！`
        )
      );

      // Play soft turn switch audio
      soundManager.playTurnSwitch();

      return {
        ...prev,
        players: currentPlayers,
        board: currentBoard,
        logs: newLogs.slice(0, 30),
        currentPlayerIndex: nextIndex,
        round: nextRound,
        isMovingPawn: false,
      };
    },
    []
  );

  // Advance turn to next active (non-bankrupt) player strictly
  const advanceTurn = useCallback(
    (
      currentPlayers: Player[],
      currentBoard: Property[],
      prevLogs: GameLog[],
      _currentRound: number,
      _maxRounds: number,
      fromPlayerIndex: number,
      _mode: GameMode
    ) => {
      isTurnProcessingRef.current = false;
      setShowDiceModal({ show: false, dice: null, isRolling: false });
      setBuildModal({
        show: false,
        property: null,
        propertyIndex: -1,
        cost: 100,
        nextLevel: 1,
        nextLevelName: '',
      });
      setShopModal({ show: false, playerIndex: 0, squareName: '' });
      setPawnModal({ show: false, playerIndex: 0, squareName: '', activeTab: 'ITEMS' });
      setBackpackModal({ show: false, playerIndex: 0 });
      setConfirmUseItemModal({ show: false, item: null });
      setRoadPassModal({ show: false, playerIndex: 0 });

      setGameState((prev) =>
        computeNextTurnState(prev, currentPlayers, currentBoard, prevLogs, fromPlayerIndex)
      );
    },
    [computeNextTurnState]
  );

  // Human player confirms building a house
  const confirmBuildHouse = () => {
    const modalProp = buildModal.property;
    if (!modalProp) return;

    setBuildModal({
      show: false,
      property: null,
      propertyIndex: -1,
      cost: 100,
      nextLevel: 1,
      nextLevelName: '',
    });

    setGameState((prev) => {
      const playerIndex = prev.currentPlayerIndex;
      const player = { ...prev.players[playerIndex] };
      const propertyIndex = buildModal.propertyIndex;
      const property: Property = { ...modalProp };
      const newLogs = [...prev.logs];
      const isAncient = prev.mapTheme === 'ANCIENT';
      const unit = isAncient ? '银两' : '金币';

      let actualCost = buildModal.cost;
      let usedDiscount = false;
      if (player.activeDiscount) {
        actualCost = Math.floor(buildModal.cost * 0.5);
        player.activeDiscount = false;
        usedDiscount = true;
      }

      if (player.money < actualCost) {
        player.money += 300;
        player.loans += 1;
        newLogs.unshift(
          createLog(
            '事件',
            `🏦【钱庄扶持】${player.name} 资金不足 ${actualCost} ${unit}，发放 300 ${unit}扶持资金！`
          )
        );
      }

      player.money -= actualCost;
      const newLevel = Math.min(property.houseLevel + 1, 5);
      property.houseLevel = newLevel;

      if (property.owner === undefined) {
        property.owner = playerIndex;
        if (!player.properties.includes(propertyIndex)) {
          player.properties = [...player.properties, propertyIndex];
        }
      }

      const newBoard = [...prev.board];
      newBoard[propertyIndex] = property;

      const newPlayers = [...prev.players];
      newPlayers[playerIndex] = player;

      const levelDesc =
        newLevel === 5
          ? isAncient
            ? '五星豪华楼阁 🏨'
            : '五星豪华旅馆 🏨'
          : isAncient
          ? `第 ${newLevel} 进庭院 🏠`
          : `第 ${newLevel} 栋小房子 🏠`;
      const discountText = usedDiscount ? '（使用【置地契书】享五折特惠）' : '';
      newLogs.unshift(
        createLog(
          '交易',
          `🔨 ${player.name} 在【${property.name}】成功建造${levelDesc}（实付 ${actualCost} ${unit}${discountText}）！`
        )
      );

      soundManager.playBuyProperty();

      return computeNextTurnState(prev, newPlayers, newBoard, newLogs, playerIndex);
    });
  };

  // Human player skips building a house
  const skipBuildHouse = () => {
    setBuildModal({
      show: false,
      property: null,
      propertyIndex: -1,
      cost: 100,
      nextLevel: 1,
      nextLevelName: '',
    });

    setGameState((prev) => {
      const newLogs = [...prev.logs];
      const player = prev.players[prev.currentPlayerIndex];
      newLogs.unshift(createLog('行动', `⏭️ ${player.name} 选择本回合暂不在此营造加建。`));

      return computeNextTurnState(
        prev,
        prev.players,
        prev.board,
        newLogs,
        prev.currentPlayerIndex
      );
    });
  };

  // Confirm and dismiss AI action modal
  const confirmAiNotice = () => {
    setAiNoticeModal({
      show: false,
      aiName: '',
      actionText: '',
      detailText: '',
      isBuild: false,
    });

    setGameState((prev) =>
      computeNextTurnState(
        prev,
        prev.players,
        prev.board,
        prev.logs,
        prev.currentPlayerIndex
      )
    );
  };

  // Confirm ancient event modal
  const confirmAncientEvent = () => {
    setAncientEventModal({ show: false, card: null, playerName: '' });

    setGameState((prev) => {
      const playerIndex = prev.currentPlayerIndex;
      const player = prev.players[playerIndex];
      const square = prev.board[player.position];

      if (
        square &&
        square.price > 0 &&
        square.owner === undefined &&
        !player.isAI &&
        player.money >= square.price
      ) {
        setBuildModal({
          show: true,
          property: square,
          propertyIndex: player.position,
          cost: square.price,
          nextLevel: 1,
          nextLevelName: prev.mapTheme === 'ANCIENT' ? '第 1 进院落 🏠' : '第 1 栋房屋 🏠',
        });
        return prev;
      }

      return computeNextTurnState(
        prev,
        prev.players,
        prev.board,
        prev.logs,
        prev.currentPlayerIndex
      );
    });
  };

  // Confirm rent payment modal
  const confirmRent = () => {
    setRentModal({
      show: false,
      payerName: '',
      receiverName: '',
      amount: 0,
      propertyName: '',
      houseLevel: 0,
      isBankrupt: false,
    });

    setGameState((prev) =>
      computeNextTurnState(
        prev,
        prev.players,
        prev.board,
        prev.logs,
        prev.currentPlayerIndex
      )
    );
  };

  // Close Game Event Modal (for chance/jail/bail/fine/reward) and advance turn if required
  const closeGameEventModal = () => {
    const shouldAdvance = gameEventModal.onConfirmAdvance;
    setGameEventModal((prev) => ({ ...prev, show: false }));

    if (shouldAdvance) {
      setGameState((prev) =>
        computeNextTurnState(
          prev,
          prev.players,
          prev.board,
          prev.logs,
          prev.currentPlayerIndex
        )
      );
    }
  };

  // Human player serves a jail turn (skips roll and serves time)
  const serveJailTurn = () => {
    setGameState((prev) => {
      const playerIndex = prev.currentPlayerIndex;
      const player = { ...prev.players[playerIndex] };
      const currentJail = player.jailTurns || 1;
      const remaining = Math.max(0, currentJail - 1);
      player.jailTurns = remaining;

      const newPlayers = [...prev.players];
      newPlayers[playerIndex] = player;
      const newLogs = [...prev.logs];
      const isAncient = prev.mapTheme === 'ANCIENT';

      const logText =
        remaining > 0
          ? `⛓️ ${player.name} 在监牢服刑思过，停留本回合（还需服刑 ${remaining} 回合）。`
          : `🕊️ ${player.name} 服刑期满开释出狱！下回合重获自由身。`;
      newLogs.unshift(createLog('行动', logText));

      setGameEventModal({
        show: true,
        eventType: 'jail',
        title: remaining > 0 ? '狱中服刑' : '刑满释放',
        badge: remaining > 0 ? (isAncient ? '🏮 羁押服刑' : '⛓️ 羁押服刑') : (isAncient ? '🕊️ 官府开释' : '🕊️ 刑满释放'),
        icon: remaining > 0 ? '⛓️' : '🕊️',
        highlightText:
          remaining > 0
            ? `「你被捕入狱，停留${remaining}回合」`
            : `「刑满释放，重获自由」`,
        details:
          remaining > 0
            ? `你涉案被官府收监，本回合必须在牢房停留思过。剩余服刑回合：${remaining}。`
            : `服刑期限已满，官府准许开释！下回合起即可重新投骰行动。`,
        jailTurns: remaining,
        amount: 0,
        playerName: player.name,
        isAI: false,
        playerAvatar: player.avatarIcon,
        playerColor: player.color,
        onConfirmAdvance: true,
      });

      return {
        ...prev,
        players: newPlayers,
        logs: newLogs.slice(0, 30),
      };
    });
  };

  // Item System: Buy item from Shop
  const buyItem = (itemId: ItemId) => {
    const item = GAME_ITEMS[itemId];
    if (!item) return;

    setGameState((prev) => {
      const playerIndex = prev.currentPlayerIndex;
      const player = { ...prev.players[playerIndex] };
      if (player.money < item.price) return prev;

      player.money -= item.price;
      player.items = [...player.items, itemId];
      soundManager.playBuyProperty();

      const newLogs = [...prev.logs];
      const unit = prev.mapTheme === 'ANCIENT' ? '银两' : '金币';
      newLogs.unshift(
        createLog(
          '交易',
          `🏮 ${player.name} 在商行采买了【${item.name}】（花费 ${item.price} ${unit}）！存入锦囊背包。`
        )
      );

      const newPlayers = [...prev.players];
      newPlayers[playerIndex] = player;

      return {
        ...prev,
        players: newPlayers,
        logs: newLogs.slice(0, 30),
      };
    });
  };

  // Item System: Sell item to Pawnshop
  const sellItem = (itemId: ItemId) => {
    const item = GAME_ITEMS[itemId];
    if (!item) return;

    setGameState((prev) => {
      const playerIndex = prev.currentPlayerIndex;
      const player = { ...prev.players[playerIndex] };
      const itemIdx = player.items.indexOf(itemId);
      if (itemIdx === -1) return prev;

      // Remove one instance
      const updatedItems = [...player.items];
      updatedItems.splice(itemIdx, 1);
      player.items = updatedItems;
      player.money += item.sellPrice;
      soundManager.playBuyProperty();

      const newLogs = [...prev.logs];
      const unit = prev.mapTheme === 'ANCIENT' ? '银两' : '金币';
      newLogs.unshift(
        createLog(
          '交易',
          `⚖️ ${player.name} 在当铺典当了【${item.name}】，换得 ${item.sellPrice} ${unit}充裕盘缠！`
        )
      );

      const newPlayers = [...prev.players];
      newPlayers[playerIndex] = player;

      return {
        ...prev,
        players: newPlayers,
        logs: newLogs.slice(0, 30),
      };
    });
  };

  // Pawnshop Mortgage Land (抵押土地)
  const mortgageProperty = (propertyIndex: number) => {
    setGameState((prev) => {
      const playerIndex = prev.currentPlayerIndex;
      const player = { ...prev.players[playerIndex] };
      const property = { ...prev.board[propertyIndex] };
      if (property.owner !== playerIndex || property.isMortgaged) return prev;

      const mortgageVal = Math.floor(property.price * 0.6) + property.houseLevel * 50;
      property.isMortgaged = true;
      property.mortgageAmount = mortgageVal;
      player.money += mortgageVal;

      soundManager.playBuyProperty();
      const newBoard = [...prev.board];
      newBoard[propertyIndex] = property;
      const newPlayers = [...prev.players];
      newPlayers[playerIndex] = player;

      const newLogs = [...prev.logs];
      const unit = prev.mapTheme === 'ANCIENT' ? '银两' : '金币';
      newLogs.unshift(
        createLog(
          '交易',
          `⚖️ ${player.name} 在当铺抵押了地产【${property.name}】，换得急用盘缠 ${mortgageVal} ${unit}！抵押期间免收过路租金。`
        )
      );

      return {
        ...prev,
        players: newPlayers,
        board: newBoard,
        logs: newLogs.slice(0, 30),
      };
    });
  };

  // Pawnshop Redeem Land (赎回土地)
  const redeemProperty = (propertyIndex: number) => {
    setGameState((prev) => {
      const playerIndex = prev.currentPlayerIndex;
      const player = { ...prev.players[playerIndex] };
      const property = { ...prev.board[propertyIndex] };
      if (property.owner !== playerIndex || !property.isMortgaged || !property.mortgageAmount)
        return prev;

      const redeemCost = property.mortgageAmount;
      if (player.money < redeemCost) return prev;

      player.money -= redeemCost;
      property.isMortgaged = false;
      property.mortgageAmount = undefined;

      soundManager.playBuyProperty();
      const newBoard = [...prev.board];
      newBoard[propertyIndex] = property;
      const newPlayers = [...prev.players];
      newPlayers[playerIndex] = player;

      const newLogs = [...prev.logs];
      const unit = prev.mapTheme === 'ANCIENT' ? '银两' : '金币';
      newLogs.unshift(
        createLog(
          '交易',
          `⚖️ ${player.name} 在当铺赎回了【${property.name}】地契（支出 ${redeemCost} ${unit}），该地产恢复正常收租！`
        )
      );

      return {
        ...prev,
        players: newPlayers,
        board: newBoard,
        logs: newLogs.slice(0, 30),
      };
    });
  };

  // Close Shop Modal and advance turn
  const closeShopModal = () => {
    setShopModal({ show: false, playerIndex: 0, squareName: '' });
    setGameState((prev) =>
      computeNextTurnState(
        prev,
        prev.players,
        prev.board,
        prev.logs,
        prev.currentPlayerIndex
      )
    );
  };

  // Close Pawn Modal and advance turn
  const closePawnModal = () => {
    setPawnModal({ show: false, playerIndex: 0, squareName: '', activeTab: 'ITEMS' });
    setGameState((prev) =>
      computeNextTurnState(
        prev,
        prev.players,
        prev.board,
        prev.logs,
        prev.currentPlayerIndex
      )
    );
  };

  const setPawnModalTab = (tab: 'ITEMS' | 'MORTGAGE' | 'REDEEM') => {
    setPawnModal((prev) => ({ ...prev, activeTab: tab }));
  };

  // Open and Close Backpack Modal
  const openBackpack = (playerIndex?: number) => {
    setBackpackModal({
      show: true,
      playerIndex: playerIndex ?? gameState.currentPlayerIndex,
    });
  };

  const closeBackpack = () => {
    setBackpackModal({ show: false, playerIndex: 0 });
  };

  // Request item usage (Pops up double confirmation dialog)
  const requestUseItem = (itemId: ItemId) => {
    const item = GAME_ITEMS[itemId];
    if (!item) return;
    setConfirmUseItemModal({ show: true, item });
  };

  const cancelUseItem = () => {
    setConfirmUseItemModal({ show: false, item: null });
  };

  // Item Action: Confirmed use of item
  const confirmExecuteUseItem = () => {
    const item = confirmUseItemModal.item;
    if (!item) return;

    const itemId = item.id;
    setConfirmUseItemModal({ show: false, item: null });

    if (itemId === 'road_pass') {
      // Open Road Pass Picker
      setBackpackModal({ show: false, playerIndex: 0 });
      setRoadPassModal({ show: true, playerIndex: gameState.currentPlayerIndex });
      return;
    }

    setGameState((prev) => {
      const playerIndex = prev.currentPlayerIndex;
      const player = { ...prev.players[playerIndex] };
      const itemIdx = player.items.indexOf(itemId);
      if (itemIdx === -1) return prev;

      const updatedItems = [...player.items];
      updatedItems.splice(itemIdx, 1);
      player.items = updatedItems;

      const newLogs = [...prev.logs];
      const isAncient = prev.mapTheme === 'ANCIENT';
      const unit = isAncient ? '银两' : '金币';

      if (itemId === 'pardon_talisman') {
        player.activeImmunity = true;
        soundManager.playBuyProperty();
        newLogs.unshift(
          createLog(
            '行动',
            `🛡️ ${player.name} 启用了【免罪符】！保佑生效：下次税司/过路租金全免！`
          )
        );
      } else if (itemId === 'land_deed') {
        player.activeDiscount = true;
        soundManager.playBuyProperty();
        newLogs.unshift(
          createLog(
            '行动',
            `📑 ${player.name} 使用了【置地契书】！下次购置地皮或加盖房屋立享五折半价！`
          )
        );
      } else if (itemId === 'lucky_bead') {
        player.money += 150;
        soundManager.playBuyProperty();
        newLogs.unshift(
          createLog(
            '事件',
            `🔮 ${player.name} 催动【定风转运珠】！鸿运当头，喜迎 150 ${unit}进账！`
          )
        );
      }

      const newPlayers = [...prev.players];
      newPlayers[playerIndex] = player;

      return {
        ...prev,
        players: newPlayers,
        logs: newLogs.slice(0, 30),
      };
    });

    setBackpackModal({ show: false, playerIndex: 0 });
  };

  // Road Pass Execution: Player selected custom dice steps
  const executeRoadPass = (chosenSteps: number) => {
    setGameState((prev) => {
      const playerIndex = prev.currentPlayerIndex;
      const player = { ...prev.players[playerIndex] };
      const itemIdx = player.items.indexOf('road_pass');
      if (itemIdx !== -1) {
        const updatedItems = [...player.items];
        updatedItems.splice(itemIdx, 1);
        player.items = updatedItems;
      }

      const newPlayers = [...prev.players];
      newPlayers[playerIndex] = player;

      const newLogs = [...prev.logs];
      newLogs.unshift(
        createLog(
          '行动',
          `📜 ${player.name} 出示官府【路引】，特权自选指定前进 ${chosenSteps} 步！`
        )
      );

      return {
        ...prev,
        players: newPlayers,
        logs: newLogs.slice(0, 30),
      };
    });

    setRoadPassModal({ show: false, playerIndex: 0 });
    executeMove(chosenSteps);
  };

  const closeRoadPassModal = () => {
    setRoadPassModal({ show: false, playerIndex: 0 });
  };

  // Resolve tile arrival actions
  const resolveLandingTile = useCallback(
    (playerIndex: number, finalPos: number) => {
      setGameState((prev) => {
        const newPlayers = [...prev.players];
        let player = { ...newPlayers[playerIndex] };
        const newBoard = [...prev.board];
        const square = { ...newBoard[finalPos] };
        const newLogs = [...prev.logs];
        const isAncient = prev.mapTheme === 'ANCIENT';
        const unit = isAncient ? '银两' : '金币';

        let willPauseForModal = false;

        // 1. Check Ancient Theme Special Cultural Events (驿站, 书院, 庙会)
        // 1. Check Ancient Theme Special Cultural Events (驿站, 书院)
        const isPostTile = isAncient && square.name.includes('驿站');
        const isAcademyTile = isAncient && (square.name.includes('书院') || square.name.includes('书斋'));

        if (isPostTile || isAcademyTile) {
          // Trigger Post / Academy Ancient Cultural Random Event
          const deck = isPostTile ? ANCIENT_EVENTS.post : ANCIENT_EVENTS.academy;
          const card = deck[Math.floor(Math.random() * deck.length)];

          if (card.amount) {
            player.money = Math.max(0, player.money + card.amount);
          }
          if (card.itemId) {
            player.items = [...player.items, card.itemId];
          }

          soundManager.playChanceCard();
          newLogs.unshift(createLog('事件', `🏮【${card.source}奇遇·${card.title}】${card.desc}`));

          if (!player.isAI) {
            willPauseForModal = true;
            setAncientEventModal({
              show: true,
              card,
              playerName: player.name,
            });
          } else {
            willPauseForModal = true;
            setAiNoticeModal({
              show: true,
              aiName: player.name,
              actionText: `AI触发【${card.source}奇遇】`,
              detailText: `【${card.title}】${card.desc}`,
              isBuild: false,
            });
          }
        } else if (square.type === 'start') {
          player.money += 100;
          soundManager.playBuyProperty();
          newLogs.unshift(
            createLog(
              '事件',
              `🎁 ${player.name} 停留在起点，领取府库年终银俸 100 ${unit}！`
            )
          );
          willPauseForModal = true;
          setGameEventModal({
            show: true,
            eventType: 'reward',
            title: isAncient ? '府库领俸' : '家庭补助',
            badge: isAncient ? '🏮 官府赏银 · 年俸入账' : '🎁 起点奖励 · 家庭补助',
            icon: '🧧',
            highlightText: player.isAI
              ? `「AI【${player.name}】停驻起点，获得100」`
              : (isAncient ? `「官府赏赐银两，获得100」` : `「到达起点发放补助，获得100」`),
            details: `${player.name} 停留在起点，按期领取府库俸银/家庭补助 100 ${unit}！`,
            amount: 100,
            playerName: player.name,
            isAI: player.isAI,
            playerAvatar: player.avatarIcon,
            playerColor: player.color,
            onConfirmAdvance: true,
          });
        } else if (square.type === 'ancient_shop') {
          // Ancient Shop Tile: Buy Items
          soundManager.playBuyProperty();
          if (!player.isAI) {
            willPauseForModal = true;
            setShopModal({
              show: true,
              playerIndex,
              squareName: square.name,
            });
            newLogs.unshift(
              createLog(
                '行动',
                `🏮 ${player.name} 踏入【${square.name}】，琳琅满目的货品映入眼帘，可采买锦囊妙品！`
              )
            );
          } else {
            // Enhanced AI Shopping: smart choice based on current game state
            if (player.money >= 200) {
              let chosenId: ItemId = 'lucky_bead';
              const unownedCount = newBoard.filter(
                (b) => b.price > 0 && b.owner === undefined
              ).length;
              const enemyHotelCount = newBoard.filter(
                (b) => b.owner !== undefined && b.owner !== playerIndex && b.houseLevel >= 3
              ).length;

              if (enemyHotelCount > 0 && !player.items.includes('pardon_talisman')) {
                chosenId = 'pardon_talisman';
              } else if (unownedCount >= 4 && !player.items.includes('land_deed')) {
                chosenId = 'land_deed';
              } else if (!player.items.includes('road_pass')) {
                chosenId = 'road_pass';
              }

              const item = GAME_ITEMS[chosenId];
              player.money -= item.price;
              player.items = [...player.items, chosenId];

              willPauseForModal = true;
              newLogs.unshift(
                createLog(
                  '交易',
                  `🏮 AI【${player.name}】在商行睿智购置了【${item.name}】（花费 ${item.price} ${unit}）！`
                )
              );
              setAiNoticeModal({
                show: true,
                aiName: player.name,
                actionText: 'AI商行自主采买',
                detailText: `AI玩家【${player.name}】审时度势，在商行花费 ${item.price} ${unit}购置了【${item.name}】！`,
                isBuild: false,
              });
            } else {
              newLogs.unshift(
                createLog('行动', `🏮 AI【${player.name}】驻足【${square.name}】，银两紧凑未采买货物。`)
              );
            }
          }
        } else if (square.type === 'pawn') {
          // Ancient Pawnshop Tile
          soundManager.playBuyProperty();
          if (!player.isAI) {
            willPauseForModal = true;
            setPawnModal({
              show: true,
              playerIndex,
              squareName: square.name,
              activeTab: 'ITEMS',
            });
            newLogs.unshift(
              createLog(
                '行动',
                `⚖️ ${player.name} 迈入【${square.name}】，可典当道具、抵押地产借银或赎回地契！`
              )
            );
          } else {
            // Enhanced AI Pawnshop logic: sell items, mortgage, or redeem!
            if (player.money < 100 && player.items.length > 0) {
              // 1. Sell item for quick cash
              const sellId = player.items[0];
              const item = GAME_ITEMS[sellId];
              player.items = player.items.slice(1);
              player.money += item.sellPrice;

              willPauseForModal = true;
              newLogs.unshift(
                createLog(
                  '交易',
                  `⚖️ AI【${player.name}】手头吃紧，在当铺典当了【${item.name}】换得 ${item.sellPrice} ${unit}！`
                )
              );
              setAiNoticeModal({
                show: true,
                aiName: player.name,
                actionText: 'AI当铺变卖道具',
                detailText: `AI玩家【${player.name}】在当铺将【${item.name}】典当，换得急用盘缠 ${item.sellPrice} ${unit}！`,
                isBuild: false,
              });
            } else if (player.money < 120 && player.properties.length > 1) {
              // 2. Mortgage a property for funds
              const unmortgagedPropId = player.properties.find(
                (pid) => !newBoard[pid]?.isMortgaged
              );
              if (unmortgagedPropId !== undefined) {
                const targetProp = { ...newBoard[unmortgagedPropId] };
                const mVal = Math.floor(targetProp.price * 0.6) + targetProp.houseLevel * 50;
                targetProp.isMortgaged = true;
                targetProp.mortgageAmount = mVal;
                player.money += mVal;
                newBoard[unmortgagedPropId] = targetProp;

                willPauseForModal = true;
                newLogs.unshift(
                  createLog(
                    '交易',
                    `⚖️ AI【${player.name}】为防破产，在当铺抵押了【${targetProp.name}】换得 ${mVal} ${unit}！`
                  )
                );
                setAiNoticeModal({
                  show: true,
                  aiName: player.name,
                  actionText: 'AI当铺抵押土地',
                  detailText: `AI玩家【${player.name}】在当铺抵押了名下【${targetProp.name}】，获得周转银两 ${mVal} ${unit}！`,
                  isBuild: false,
                });
              }
            } else if (player.money > 450) {
              // 3. Redeem a mortgaged property if flush with cash
              const mortgagedPropId = player.properties.find(
                (pid) => newBoard[pid]?.isMortgaged && (newBoard[pid]?.mortgageAmount || 0) <= player.money
              );
              if (mortgagedPropId !== undefined) {
                const targetProp = { ...newBoard[mortgagedPropId] };
                const rCost = targetProp.mortgageAmount!;
                player.money -= rCost;
                targetProp.isMortgaged = false;
                targetProp.mortgageAmount = undefined;
                newBoard[mortgagedPropId] = targetProp;

                willPauseForModal = true;
                newLogs.unshift(
                  createLog(
                    '交易',
                    `⚖️ AI【${player.name}】手头宽裕，在当铺赎回了【${targetProp.name}】地契（支出 ${rCost} ${unit}）！`
                  )
                );
                setAiNoticeModal({
                  show: true,
                  aiName: player.name,
                  actionText: 'AI当铺赎回地契',
                  detailText: `AI玩家【${player.name}】在当铺出资 ${rCost} ${unit}赎回了【${targetProp.name}】地契，恢复收租！`,
                  isBuild: false,
                });
              }
            } else {
              newLogs.unshift(
                createLog('行动', `⚖️ AI【${player.name}】路过【${square.name}】，现下盘缠平稳未作典当。`)
              );
            }
          }
        } else if (square.type === 'chance') {
          const cardDeck = isAncient ? ANCIENT_CHANCE_CARDS : CHANCE_CARDS;
          const card = cardDeck[Math.floor(Math.random() * cardDeck.length)];
          setActiveChanceCard(card);
          soundManager.playChanceCard();
          willPauseForModal = true;

          if (card.type === 'jail') {
            const jTurns = card.jailTurns || 2;
            player.jailTurns = jTurns;
            newLogs.unshift(
              createLog('事件', `🚨【${isAncient ? '官府收监' : '被捕入狱'}】${player.name} ${card.desc}`)
            );
            setGameEventModal({
              show: true,
              eventType: 'jail',
              title: card.title,
              badge: isAncient ? '🏮 官府收监 · 押送大牢' : '🚨 依法缉拿 · 拘役入狱',
              icon: '⛓️',
              highlightText: player.isAI
                ? `「AI【${player.name}】被捕入狱，停留${jTurns}回合」`
                : `「你被捕入狱，停留${jTurns}回合」`,
              details: card.desc,
              jailTurns: jTurns,
              amount: 0,
              playerName: player.name,
              isAI: player.isAI,
              playerAvatar: player.avatarIcon,
              playerColor: player.color,
              onConfirmAdvance: true,
            });
          } else if (card.type === 'bail') {
            player.jailTurns = 0;
            player.money += card.amount;
            newLogs.unshift(
              createLog('事件', `🕊️【${isAncient ? '恩准脱罪' : '取保出狱'}】${player.name} ${card.desc}`)
            );
            setGameEventModal({
              show: true,
              eventType: 'bail',
              title: card.title,
              badge: isAncient ? '📜 乡绅具保 · 恩准脱罪' : '⚖️ 律师担保 · 保释出狱',
              icon: '🕊️',
              highlightText: player.isAI
                ? `「AI【${player.name}】取保出狱，发还${card.amount}」`
                : `「成功保释出狱，获得${card.amount}」`,
              details: card.desc,
              amount: card.amount,
              playerName: player.name,
              isAI: player.isAI,
              playerAvatar: player.avatarIcon,
              playerColor: player.color,
              onConfirmAdvance: true,
            });
          } else if (card.type === 'gain') {
            player.money += card.amount;
            newLogs.unshift(
              createLog('事件', `✨【${isAncient ? '赏赐银两' : '奖励银两'}】${player.name} ${card.desc}`)
            );
            setGameEventModal({
              show: true,
              eventType: 'reward',
              title: card.title,
              badge: isAncient ? '🏮 官府赏赐 · 赏赐银两' : '🎁 嘉奖到账 · 获得资金',
              icon: '💰',
              highlightText: player.isAI
                ? (card.title.includes('官府赏赐')
                    ? `「AI【${player.name}】官府赏赐银两，获得${card.amount}」`
                    : `「AI【${player.name}】获得奖励，获得${card.amount}」`)
                : (card.title.includes('官府赏赐')
                    ? `「官府赏赐银两，获得${card.amount}」`
                    : `「荣获奖赏银两，获得${card.amount}」`),
              details: card.desc,
              amount: card.amount,
              playerName: player.name,
              isAI: player.isAI,
              playerAvatar: player.avatarIcon,
              playerColor: player.color,
              onConfirmAdvance: true,
            });
          } else if (card.type === 'loss') {
            const lossAmount = Math.abs(card.amount);
            player.money = Math.max(0, player.money - lossAmount);
            newLogs.unshift(
              createLog('事件', `💸【${isAncient ? '罚银支出' : '违章罚款'}】${player.name} ${card.desc}`)
            );
            setGameEventModal({
              show: true,
              eventType: 'fine',
              title: card.title,
              badge: isAncient ? '🏛️ 律例罚银 · 扣除款项' : '⚠️ 违规扣款 · 缴纳罚金',
              icon: '💸',
              highlightText: player.isAI
                ? `「AI【${player.name}】缴纳罚金，支出${lossAmount}」`
                : `「违反规定罚款，扣除${lossAmount}」`,
              details: card.desc,
              amount: -lossAmount,
              playerName: player.name,
              isAI: player.isAI,
              playerAvatar: player.avatarIcon,
              playerColor: player.color,
              onConfirmAdvance: true,
            });
          } else {
            newLogs.unshift(
              createLog('事件', `✨【${isAncient ? '江湖机缘' : '机会卡'}】${player.name} ${card.desc}`)
            );
            setGameEventModal({
              show: true,
              eventType: 'chance',
              title: card.title,
              badge: isAncient ? '🏮 江湖机缘 · 闲适时光' : '✨ 机会卡 · 悠闲假日',
              icon: '🍀',
              highlightText: player.isAI
                ? `「AI【${player.name}】触发机会事件」`
                : `「触发机会卡事件：${card.title}」`,
              details: card.desc,
              amount: 0,
              playerName: player.name,
              isAI: player.isAI,
              playerAvatar: player.avatarIcon,
              playerColor: player.color,
              onConfirmAdvance: true,
            });
          }
        } else if (square.type === 'tax') {
          // Check Pardon Talisman / Active Immunity
          const hasImmunity = player.activeImmunity || player.items.includes('pardon_talisman');

          if (hasImmunity) {
            if (player.activeImmunity) {
              player.activeImmunity = false;
            } else {
              const idx = player.items.indexOf('pardon_talisman');
              if (idx !== -1) {
                const updated = [...player.items];
                updated.splice(idx, 1);
                player.items = updated;
              }
            }
            soundManager.playBuyProperty();
            newLogs.unshift(
              createLog(
                '事件',
                `🛡️【免罪符护佑】${player.name} 亮出免罪符，官府特免本次税赋 60 ${unit}！保全家财！`
              )
            );
            willPauseForModal = true;
            setGameEventModal({
              show: true,
              eventType: 'bail',
              title: square.name,
              badge: '🛡️ 免罪符生效 · 豁免税款',
              icon: '🛡️',
              highlightText: player.isAI
                ? `「AI【${player.name}】免罪符生效，免交税款」`
                : `「免罪符生效，免除税赋罚金」`,
              details: `${player.name} 亮出随身免罪符，官府特许免交本次税赋 60 ${unit}！`,
              amount: 0,
              playerName: player.name,
              isAI: player.isAI,
              playerAvatar: player.avatarIcon,
              playerColor: player.color,
              onConfirmAdvance: true,
            });
          } else {
            const taxAmount = 60;
            soundManager.playPayRent();
            let isPlayerBankrupt = false;
            if (prev.gameMode === 'BANKRUPTCY' && player.money < taxAmount) {
              isPlayerBankrupt = true;
              player.money = 0;
              player.isBankrupt = true;
              newBoard.forEach((b) => {
                if (b.owner === playerIndex) {
                  b.owner = undefined;
                  b.houseLevel = 0;
                  b.isMortgaged = false;
                }
              });
              player.properties = [];
              newLogs.unshift(
                createLog('事件', `💥【破产出局】${player.name} 无力缴纳赋税，遗憾破产淘汰！`)
              );
            } else {
              player.money -= taxAmount;
              newLogs.unshift(
                createLog('事件', `🏛️ ${player.name} 到达${square.name}，缴纳税款 ${taxAmount} ${unit}。`)
              );
            }

            willPauseForModal = true;
            setGameEventModal({
              show: true,
              eventType: 'fine',
              title: square.name,
              badge: isAncient ? '🏛️ 户部纳税 · 缴纳税银' : '🏛️ 税务申报 · 缴纳罚金',
              icon: '🧾',
              highlightText: player.isAI
                ? `「AI【${player.name}】缴纳税款，支出${taxAmount}」`
                : (isPlayerBankrupt ? `「资金不足破产出局」` : `「依法缴纳税赋罚款，支出${taxAmount}」`),
              details: isPlayerBankrupt
                ? `${player.name} 现存现金不足以缴纳税赋 ${taxAmount} ${unit}，遗憾破产淘汰！`
                : `${player.name} 停留在【${square.name}】，按律法规定如实缴纳税款 60 ${unit}。`,
              amount: -taxAmount,
              playerName: player.name,
              isAI: player.isAI,
              playerAvatar: player.avatarIcon,
              playerColor: player.color,
              onConfirmAdvance: true,
            });
          }
        } else if (square.type === 'park') {
          newLogs.unshift(
            createLog('事件', `🌳 ${player.name} 在风景宜人的别苑/公园绿荫小憩，休养生息。`)
          );
        } else {
          // Normal Property Tile (or Academy Property on Ancient Map)
          const isPropertySquare = square.price > 0;

          if (isPropertySquare) {

            if (square.owner === undefined) {
              // Buy unowned property
              let actualPrice = square.price;
              let usedDeed = false;
              if (player.activeDiscount) {
                actualPrice = Math.floor(square.price * 0.5);
                player.activeDiscount = false;
                usedDeed = true;
              }

              const canBuy = player.isAI
                ? player.money >= actualPrice + 100
                : player.money >= actualPrice;

              if (canBuy) {
                player.money -= actualPrice;
                player.properties = [...player.properties, finalPos];
                const updatedSquare = { ...square, owner: playerIndex };
                newBoard[finalPos] = updatedSquare;
                soundManager.playBuyProperty();

                const deedNote = usedDeed
                  ? `（使用【置地契书】享五折半价，实付 ${actualPrice} ${unit}）`
                  : `（花费 ${actualPrice} ${unit}）`;
                newLogs.unshift(
                  createLog('交易', `🏡 ${player.name} 买下地产【${square.name}】${deedNote}！成为该地块所有者。`)
                );

                if (!player.isAI) {
                  willPauseForModal = true;
                  const nextLvl = 1;
                  const nextLvlName = isAncient ? '第 1 进院落 🏠' : '第 1 栋房屋 🏠';

                  setBuildModal({
                    show: true,
                    property: updatedSquare,
                    propertyIndex: finalPos,
                    cost: 100,
                    nextLevel: nextLvl,
                    nextLevelName: nextLvlName,
                  });
                  newLogs.unshift(
                    createLog(
                      '交易',
                      `🔨 ${player.name} 刚买下【${square.name}】，是否在此建造第一栋房屋/庭院？`
                    )
                  );
                }
              } else {
                newLogs.unshift(createLog('行动', `👀 ${player.name} 途经空地【${square.name}】，未购买土地。`));
              }
            } else if (square.owner !== playerIndex) {
              // Landed on another player's property:
              // Check if mortgaged!
              if (square.isMortgaged) {
                const owner = newPlayers[square.owner];
                soundManager.playBuyProperty();
                newLogs.unshift(
                  createLog(
                    '租金',
                    `⚖️ ${player.name} 停留在【${square.name}】(${owner?.name}名下)，该地产已在当铺抵押中，暂停收取租金！免去过路费！`
                  )
                );
              } else {
                // Not mortgaged: check Immunity or pay rent
                const ownerIndex = square.owner;
                const owner = { ...newPlayers[ownerIndex] };
                const rent = square.rent + square.houseLevel * 45;

                const hasImmunity = player.activeImmunity || player.items.includes('pardon_talisman');

                if (hasImmunity) {
                  if (player.activeImmunity) {
                    player.activeImmunity = false;
                  } else {
                    const idx = player.items.indexOf('pardon_talisman');
                    if (idx !== -1) {
                      const updated = [...player.items];
                      updated.splice(idx, 1);
                      player.items = updated;
                    }
                  }

                  soundManager.playBuyProperty();
                  newLogs.unshift(
                    createLog(
                      '租金',
                      `🛡️【免罪符庇佑】${player.name} 催动免罪符，免除向 ${owner.name} 支付的 ${rent} ${unit}过路租金，安然脱身！`
                    )
                  );

                  willPauseForModal = true;
                  setRentModal({
                    show: true,
                    payerName: player.name,
                    payerAvatar: player.avatarIcon,
                    payerColor: player.color,
                    receiverName: owner.name,
                    receiverAvatar: owner.avatarIcon,
                    receiverColor: owner.color,
                    amount: 0,
                    propertyName: `${square.name}（免罪符已免单）`,
                    houseLevel: square.houseLevel,
                    isBankrupt: false,
                  });
                } else {
                  soundManager.playPayRent();

                  const houseText =
                    square.houseLevel >= 5
                      ? isAncient ? '五星豪华楼阁' : '五星豪华旅馆'
                      : square.houseLevel > 0
                      ? isAncient ? `${square.houseLevel}进庭院` : `${square.houseLevel}栋房屋`
                      : '基础地皮';

                  willPauseForModal = true;
                  let isPlayerBankrupt = false;

                  if (prev.gameMode === 'BANKRUPTCY' && player.money < rent) {
                    isPlayerBankrupt = true;
                    const paid = Math.max(0, player.money);
                    owner.money += paid;
                    player.money = 0;
                    player.isBankrupt = true;
                    newBoard.forEach((b) => {
                      if (b.owner === playerIndex) {
                        b.owner = undefined;
                        b.houseLevel = 0;
                        b.isMortgaged = false;
                      }
                    });
                    player.properties = [];
                    newPlayers[ownerIndex] = owner;
                    newLogs.unshift(
                      createLog(
                        '租金',
                        `💥【破产出局】${player.name} 现金不足支付租金 ${rent} ${unit}给 ${owner.name}，不幸破产出局！`
                      )
                    );
                  } else {
                    player.money -= rent;
                    owner.money += rent;
                    newPlayers[ownerIndex] = owner;
                    newLogs.unshift(
                      createLog(
                        '租金',
                        `💸 ${player.name} 停留在【${square.name}】(${owner.name}名下·${houseText})，支付租金 ${rent} ${unit}！`
                      )
                    );
                  }

                  setRentModal({
                    show: true,
                    payerName: player.name,
                    payerAvatar: player.avatarIcon,
                    payerColor: player.color,
                    receiverName: owner.name,
                    receiverAvatar: owner.avatarIcon,
                    receiverColor: owner.color,
                    amount: rent,
                    propertyName: square.name,
                    houseLevel: square.houseLevel,
                    isBankrupt: isPlayerBankrupt,
                  });
                }
              }
            } else {
              // Landed on OWN property: can build or upgrade if not mortgaged
              const currentSquareState = newBoard[finalPos];

              if (currentSquareState.isMortgaged) {
                newLogs.unshift(
                  createLog('行动', `⚖️ 【${currentSquareState.name}】尚在当铺抵押中，需在当铺赎回地契后方可营造加建。`)
                );
              } else if (player.isAI) {
                if (currentSquareState.houseLevel < 5) {
                  willPauseForModal = true;
                  const canAiBuild = player.money >= 200;

                  if (canAiBuild) {
                    player.money -= 100;
                    const nextLvl = currentSquareState.houseLevel + 1;
                    newBoard[finalPos] = { ...currentSquareState, houseLevel: nextLvl };
                    const lvlDesc =
                      nextLvl === 5
                        ? isAncient ? '五星豪华楼阁 🏨' : '五星豪华旅馆 🏨'
                        : isAncient ? `第 ${nextLvl} 进庭院 🏠` : `第 ${nextLvl} 栋房屋 🏠`;
                    soundManager.playBuyProperty();
                    newLogs.unshift(
                      createLog(
                        '交易',
                        `🔨 AI东家【${player.name}】在自家产业【${square.name}】选择【营造加建】！`
                      )
                    );

                    setAiNoticeModal({
                      show: true,
                      aiName: player.name,
                      actionText: `AI东家【${player.name}】，选择【建造加建】`,
                      detailText: `在自家领地【${square.name}】投资 100 ${unit}，升级为${lvlDesc}！`,
                      isBuild: true,
                    });
                  } else {
                    newLogs.unshift(
                      createLog(
                        '行动',
                        `⏭️ AI东家【${player.name}】在自家产业【${square.name}】选择【不加建】。`
                      )
                    );

                    setAiNoticeModal({
                      show: true,
                      aiName: player.name,
                      actionText: `AI东家【${player.name}】，选择【暂不加建】`,
                      detailText: `在自家领地【${square.name}】决定观望，保留现金防范风险。`,
                      isBuild: false,
                    });
                  }
                } else {
                  newLogs.unshift(
                    createLog('行动', `🏨 AI东家【${player.name}】巡视自家【${square.name}】楼阁，已达满级！`)
                  );
                }
              } else {
                // Human landed on OWN property: POP UP BUILD MODAL
                if (currentSquareState.houseLevel < 5) {
                  willPauseForModal = true;
                  const nextLvl = currentSquareState.houseLevel + 1;
                  const nextLvlName =
                    nextLvl === 5
                      ? isAncient ? '五星豪华楼阁 🏨' : '五星豪华旅馆 🏨'
                      : isAncient ? `第 ${nextLvl} 进庭院 🏠` : `第 ${nextLvl} 栋房屋 🏠`;

                  setBuildModal({
                    show: true,
                    property: currentSquareState,
                    propertyIndex: finalPos,
                    cost: 100,
                    nextLevel: nextLvl,
                    nextLevelName: nextLvlName,
                  });
                  newLogs.unshift(
                    createLog(
                      '交易',
                      `🔨 ${player.name} 停留在自家产业【${currentSquareState.name}】，是否在此营造加建？`
                    )
                  );
                } else {
                  newLogs.unshift(
                    createLog('行动', `🏨 【${currentSquareState.name}】已达到满级，无法再升级！`)
                  );
                }
              }
            }
          }
        }

        // Check soft relief loan in Rounds Mode
        player = checkAndApplyLoan(player, newLogs, prev.gameMode, isAncient);
        newPlayers[playerIndex] = player;

        if (!willPauseForModal) {
          setTimeout(() => {
            advanceTurn(
              newPlayers,
              newBoard,
              newLogs,
              prev.round,
              prev.maxRounds,
              playerIndex,
              prev.gameMode
            );
          }, 400);
        }

        return {
          ...prev,
          players: newPlayers,
          board: newBoard,
          logs: newLogs.slice(0, 30),
          isMovingPawn: false,
        };
      });
    },
    [advanceTurn]
  );

  // Execute Move with Step-by-Step pawn movement animation
  const executeMove = useCallback(
    (steps: number) => {
      setGameState((prev) => {
        const playerIndex = prev.currentPlayerIndex;
        const player = prev.players[playerIndex];
        if (!player || player.isBankrupt) return prev;

        const startPos = player.position;
        const targetPos = (startPos + steps) % 24;

        let currentPos = startPos;
        let stepCount = 0;
        const totalSteps = steps;

        const isAncient = prev.mapTheme === 'ANCIENT';
        const diceName = isAncient ? '骨骰' : '骰子';
        const newLogs = [...prev.logs];
        newLogs.unshift(
          createLog('行动', `🎲 ${player.name} 投出 ${steps} 点，开始漫步向前移动！`)
        );

        if (movementTimerRef.current) clearInterval(movementTimerRef.current);

        movementTimerRef.current = setInterval(() => {
          stepCount += 1;
          currentPos = (currentPos + 1) % 24;
          soundManager.playStep();

          setGameState((latest) => {
            const updatedPlayers = [...latest.players];
            const p = { ...updatedPlayers[playerIndex], position: currentPos };

            // Passed start tile rewards 100
            if (currentPos === 0 && stepCount < totalSteps) {
              p.money += 100;
              soundManager.playBuyProperty();
              const giftDesc = latest.mapTheme === 'ANCIENT' ? '府库领俸 100 银两' : '家庭补助 100 金币';
              latest.logs.unshift(createLog('事件', `🚩 ${p.name} 途经起点，喜获${giftDesc}！`));
            }

            updatedPlayers[playerIndex] = p;
            return {
              ...latest,
              players: updatedPlayers,
              logs: latest.logs.slice(0, 30),
            };
          });

          if (stepCount >= totalSteps) {
            if (movementTimerRef.current) {
              clearInterval(movementTimerRef.current);
              movementTimerRef.current = null;
            }

            setTimeout(() => {
              resolveLandingTile(playerIndex, targetPos);
            }, 180);
          }
        }, 220);

        return {
          ...prev,
          logs: newLogs.slice(0, 30),
          isMovingPawn: true,
        };
      });
    },
    [resolveLandingTile]
  );

  // AI Automated Turn Controller (Handles autonomous item usage, rolling, etc.)
  useEffect(() => {
    if (
      !canRunAi ||
      isSetup ||
      gameState.isGameOver ||
      gameState.players.length === 0 ||
      showDiceModal.show ||
      buildModal.show ||
      aiNoticeModal.show ||
      ancientEventModal.show ||
      gameEventModal.show ||
      rentModal.show ||
      shopModal.show ||
      pawnModal.show ||
      backpackModal.show ||
      confirmUseItemModal.show ||
      roadPassModal.show ||
      gameState.isMovingPawn ||
      isTurnProcessingRef.current
    ) {
      return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer && currentPlayer.isAI && !currentPlayer.isBankrupt) {
      isTurnProcessingRef.current = true;

      aiTimerRef.current = setTimeout(() => {
        // AI Jail Handling: If currently serving jail time
        if (currentPlayer.jailTurns && currentPlayer.jailTurns > 0) {
          // Check if AI has pardon talisman to escape
          if (currentPlayer.items.includes('pardon_talisman')) {
            const pIdx = currentPlayer.items.indexOf('pardon_talisman');
            currentPlayer.items.splice(pIdx, 1);
            currentPlayer.jailTurns = 0;
            setGameState((prev) => {
              const nl = [...prev.logs];
              nl.unshift(createLog('行动', `🕊️ AI【${currentPlayer.name}】出示【免罪符】免除牢役，重获自由！`));
              return { ...prev, logs: nl.slice(0, 30) };
            });
            setGameEventModal({
              show: true,
              eventType: 'bail',
              title: '免罪脱刑',
              badge: '🛡️ 免罪符生效 · 恩准脱罪',
              icon: '🕊️',
              highlightText: `「AI【${currentPlayer.name}】取保出狱」`,
              details: `AI玩家【${currentPlayer.name}】出示随身至宝【免罪符】，直接免去牢狱之灾，重获自由！`,
              playerName: currentPlayer.name,
              isAI: true,
              playerAvatar: currentPlayer.avatarIcon,
              playerColor: currentPlayer.color,
              onConfirmAdvance: false,
            });
            isTurnProcessingRef.current = false;
            return;
          }

          // Otherwise serve 1 jail turn
          const rem = Math.max(0, currentPlayer.jailTurns - 1);
          currentPlayer.jailTurns = rem;
          setGameState((prev) => {
            const nl = [...prev.logs];
            nl.unshift(
              createLog('行动', `⛓️ AI【${currentPlayer.name}】在狱中服刑，本回合无法行动（剩余 ${rem} 回合）。`)
            );
            return { ...prev, logs: nl.slice(0, 30) };
          });

          setGameEventModal({
            show: true,
            eventType: 'jail',
            title: rem > 0 ? '狱中服刑' : '刑满释放',
            badge: rem > 0 ? '⛓️ 羁押服刑 · 停留回合' : '🕊️ 刑满释放',
            icon: rem > 0 ? '⛓️' : '🕊️',
            highlightText:
              rem > 0
                ? `「AI【${currentPlayer.name}】被捕入狱，停留${rem}回合」`
                : `「AI【${currentPlayer.name}】刑满释放」`,
            details:
              rem > 0
                ? `AI玩家【${currentPlayer.name}】由于违规涉案被官府收监，本回合暂停行动。剩余服刑回合：${rem}。`
                : `AI玩家【${currentPlayer.name}】服刑期限已满，官府准许开释出狱！`,
            jailTurns: rem,
            amount: 0,
            playerName: currentPlayer.name,
            isAI: true,
            playerAvatar: currentPlayer.avatarIcon,
            playerColor: currentPlayer.color,
            onConfirmAdvance: true,
          });
          isTurnProcessingRef.current = false;
          return;
        }

        // AI Autonomous Item Usage:
        // 1. If has lucky bead: use immediately!
        if (currentPlayer.items.includes('lucky_bead')) {
          const beadIdx = currentPlayer.items.indexOf('lucky_bead');
          currentPlayer.items.splice(beadIdx, 1);
          currentPlayer.money += 150;
          soundManager.playBuyProperty();
          setGameState((prev) => {
            const nl = [...prev.logs];
            nl.unshift(createLog('事件', `🔮 AI【${currentPlayer.name}】催动【定风转运珠】，喜得 150 银两！`));
            return { ...prev, logs: nl.slice(0, 30) };
          });
        }

        // 2. If has immunity and not active: activate!
        if (currentPlayer.items.includes('pardon_talisman') && !currentPlayer.activeImmunity) {
          const pIdx = currentPlayer.items.indexOf('pardon_talisman');
          currentPlayer.items.splice(pIdx, 1);
          currentPlayer.activeImmunity = true;
          setGameState((prev) => {
            const nl = [...prev.logs];
            nl.unshift(createLog('行动', `🛡️ AI【${currentPlayer.name}】激活了【免罪符】庇护！`));
            return { ...prev, logs: nl.slice(0, 30) };
          });
        }

        // 3. If has land_deed: activate discount!
        if (currentPlayer.items.includes('land_deed') && !currentPlayer.activeDiscount) {
          const dIdx = currentPlayer.items.indexOf('land_deed');
          currentPlayer.items.splice(dIdx, 1);
          currentPlayer.activeDiscount = true;
          soundManager.playBuyProperty();
          setGameState((prev) => {
            const nl = [...prev.logs];
            nl.unshift(createLog('行动', `📑 AI【${currentPlayer.name}】启用了【置地契书】，预备享受半价置地！`));
            return { ...prev, logs: nl.slice(0, 30) };
          });
        }

        // 4. If has road_pass: AI calculates optimal roll to hit start or unowned high rent tile!
        let chosenDice: number | null = null;
        if (currentPlayer.items.includes('road_pass')) {
          // Check steps to reach start
          const stepsToStart = (24 - currentPlayer.position) % 24;
          if (stepsToStart >= 2 && stepsToStart <= 12) {
            chosenDice = stepsToStart;
          } else {
            // Find unowned property in 2..12 range
            for (let step = 12; step >= 2; step--) {
              const target = (currentPlayer.position + step) % 24;
              if (gameState.board[target]?.price > 0 && gameState.board[target]?.owner === undefined) {
                chosenDice = step;
                break;
              }
            }
          }

          if (chosenDice) {
            const rIdx = currentPlayer.items.indexOf('road_pass');
            currentPlayer.items.splice(rIdx, 1);
            setGameState((prev) => {
              const nl = [...prev.logs];
              nl.unshift(createLog('行动', `📜 AI【${currentPlayer.name}】运用【路引】特权，指定前进 ${chosenDice} 步！`));
              return { ...prev, logs: nl.slice(0, 30) };
            });
            executeMove(chosenDice);
            return;
          }
        }

        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;

        setShowDiceModal({ show: true, dice: [d1, d2], isRolling: true });

        setTimeout(() => {
          setShowDiceModal({ show: true, dice: [d1, d2], isRolling: false });

          setTimeout(() => {
            setShowDiceModal({ show: false, dice: null, isRolling: false });
            executeMove(d1 + d2);
          }, 850);
        }, 600);
      }, 1000);
    }

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [
    gameState.currentPlayerIndex,
    gameState.players,
    gameState.board,
    isSetup,
    gameState.isGameOver,
    gameState.isMovingPawn,
    showDiceModal.show,
    buildModal.show,
    aiNoticeModal.show,
    ancientEventModal.show,
    gameEventModal.show,
    rentModal.show,
    shopModal.show,
    pawnModal.show,
    backpackModal.show,
    confirmUseItemModal.show,
    roadPassModal.show,
    executeMove,
    canRunAi,
  ]);

  // Dismiss local info modal on spectator screens without advancing turn
  const dismissLocalInfoModal = useCallback(
    (type: 'dice' | 'aiNotice' | 'rent' | 'gameEvent' | 'ancientEvent') => {
      if (type === 'dice') {
        setShowDiceModal({ show: false, dice: null, isRolling: false });
      } else if (type === 'aiNotice') {
        setAiNoticeModal((prev) => ({ ...prev, show: false }));
      } else if (type === 'rent') {
        setRentModal((prev) => ({ ...prev, show: false }));
      } else if (type === 'gameEvent') {
        setGameEventModal((prev) => ({ ...prev, show: false }));
      } else if (type === 'ancientEvent') {
        setAncientEventModal((prev) => ({ ...prev, show: false }));
      }
    },
    []
  );

  // Apply state synchronized from online multiplayer room
  const applyRemoteState = useCallback((remoteRoom: GameRoom) => {
    isTurnProcessingRef.current = false;

    if (remoteRoom.gameState) {
      setGameState((prev) => {
        if (prev.currentPlayerIndex !== remoteRoom.gameState!.currentPlayerIndex) {
          setShopModal({ show: false, playerIndex: 0, squareName: '' });
          setPawnModal({ show: false, playerIndex: 0, squareName: '', activeTab: 'ITEMS' });
          setBackpackModal({ show: false, playerIndex: 0 });
          setConfirmUseItemModal({ show: false, item: null });
          setRoadPassModal({ show: false, playerIndex: 0 });
        }
        return remoteRoom.gameState!;
      });
      setIsSetup(false);
    }

    setGameEventModal(
      remoteRoom.eventModal || {
        show: false,
        eventType: 'chance',
        title: '',
        badge: '',
        icon: '✨',
        highlightText: '',
        details: '',
        playerName: '',
        isAI: false,
      }
    );

    setBuildModal(
      remoteRoom.buildModal || {
        show: false,
        property: null,
        propertyIndex: -1,
        cost: 100,
        nextLevel: 1,
        nextLevelName: '',
      }
    );

    setRentModal(
      remoteRoom.rentModal || {
        show: false,
        payerName: '',
        receiverName: '',
        amount: 0,
        propertyName: '',
        houseLevel: 0,
      }
    );

    setAncientEventModal(
      remoteRoom.ancientEventModal || {
        show: false,
        card: null,
        playerName: '',
      }
    );

    setAiNoticeModal(
      remoteRoom.aiNoticeModal || {
        show: false,
        aiName: '',
        actionText: '',
        detailText: '',
        isBuild: false,
      }
    );

    if (remoteRoom.diceState) {
      setShowDiceModal({
        show: true,
        dice: [remoteRoom.diceState.d1, remoteRoom.diceState.d2],
        isRolling: remoteRoom.diceState.isRolling,
      });
    } else {
      setShowDiceModal({ show: false, dice: null, isRolling: false });
    }
  }, []);

  return {
    gameState,
    isSetup,
    setupGame,
    resetToSetup,
    applyRemoteState,
    dismissLocalInfoModal,
    showDiceModal,
    setShowDiceModal,
    executeMove,
    buildModal,
    confirmBuildHouse,
    skipBuildHouse,
    aiNoticeModal,
    confirmAiNotice,
    ancientEventModal,
    confirmAncientEvent,
    gameEventModal,
    closeGameEventModal,
    serveJailTurn,
    rentModal,
    confirmRent,
    shopModal,
    buyItem,
    closeShopModal,
    pawnModal,
    sellItem,
    mortgageProperty,
    redeemProperty,
    setPawnModalTab,
    closePawnModal,
    backpackModal,
    openBackpack,
    closeBackpack,
    requestUseItem,
    confirmUseItemModal,
    cancelUseItem,
    confirmExecuteUseItem,
    roadPassModal,
    executeRoadPass,
    closeRoadPassModal,
    activeChanceCard,
    setActiveChanceCard,
    isTurnProcessing: isTurnProcessingRef.current,
  };
};
