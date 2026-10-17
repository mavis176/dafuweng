import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Player,
  GameState,
  Property,
  getPropertyValue,
  BuildModalState,
  AiNoticeModalState,
  RentModalState,
  GameMode,
  LogCategory,
  GameLog,
} from '../types';
import { BOARD_DATA, CHANCE_CARDS, ChanceCard } from '../constants';

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

export const useGameEngine = () => {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayerIndex: 0,
    board: BOARD_DATA,
    logs: [createLog('系统', '欢迎来到【家庭大富翁】！请选择游戏模式与玩家并开局。')],
    isGameOver: false,
    round: 1,
    maxRounds: 15,
    gameMode: 'ROUNDS',
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

  // Turn processing lock to prevent double-rolls or race conditions
  const isTurnProcessingRef = useRef(false);
  const movementTimerRef = useRef<NodeJS.Timeout | null>(null);
  const aiTimerRef = useRef<NodeJS.Timeout | null>(null);

  const colors = ['#E53935', '#0288D1', '#FB8C00', '#43A047'];
  const avatars = ['👨‍👩‍👧', '👦', '👧', '🤖'];

  const setupGame = (
    playerConfigs: { name: string; isAI: boolean }[],
    rounds = 15,
    mode: GameMode = 'ROUNDS'
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
    }));

    const cleanBoard = BOARD_DATA.map((sq) => ({ ...sq, owner: undefined, houseLevel: 0 }));

    setGameState({
      players,
      currentPlayerIndex: 0,
      board: cleanBoard,
      logs: [
        createLog(
          '系统',
          `🎉 游戏正式开局！模式：${
            mode === 'ROUNDS' ? `【轮数争霸 (${rounds}轮)】` : '【破产淘汰模式】'
          }。第 1 位玩家准备掷骰！`
        ),
      ],
      isGameOver: false,
      round: 1,
      maxRounds: rounds,
      gameMode: mode,
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
    isTurnProcessingRef.current = false;
  };

  // Helper: check bankruptcy and grant soft family bank relief (in Rounds mode)
  const checkAndApplyLoan = (player: Player, newLogs: GameLog[], mode: GameMode): Player => {
    if (mode === 'ROUNDS' && player.money <= 0) {
      const loanAmount = 300;
      newLogs.unshift(
        createLog(
          '事件',
          `🏦【爱心银行】${player.name} 资金耗尽，银行发放 ${loanAmount} 金币免息爱心基金，鼓励继续游玩！`
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

  // Advance turn to next active (non-bankrupt) player strictly
  const advanceTurn = useCallback(
    (
      currentPlayers: Player[],
      currentBoard: Property[],
      prevLogs: GameLog[],
      currentRound: number,
      maxRounds: number,
      fromPlayerIndex: number,
      mode: GameMode
    ) => {
      const newLogs = [...prevLogs];

      // Check Bankruptcy mode game-over condition
      if (mode === 'BANKRUPTCY') {
        const survivingPlayers = currentPlayers.filter((p) => !p.isBankrupt);
        if (survivingPlayers.length <= 1) {
          const winner = survivingPlayers[0] || currentPlayers[0];
          newLogs.unshift(
            createLog(
              '系统',
              `👑【破产淘汰赛决胜】除 ${winner.name} 外所有选手均已破产出局，${winner.name} 成为最终获胜大赢家！`
            )
          );
          setGameState((prev) => ({
            ...prev,
            players: currentPlayers,
            board: currentBoard,
            logs: newLogs.slice(0, 30),
            isGameOver: true,
            winner,
            isMovingPawn: false,
          }));
          isTurnProcessingRef.current = false;
          return;
        }
      }

      // Find next non-bankrupt player index
      let nextPlayerIndex = (fromPlayerIndex + 1) % currentPlayers.length;
      let loopCount = 0;
      while (currentPlayers[nextPlayerIndex].isBankrupt && loopCount < currentPlayers.length) {
        nextPlayerIndex = (nextPlayerIndex + 1) % currentPlayers.length;
        loopCount++;
      }

      let nextRound = currentRound;
      // If round wrapped around
      if (nextPlayerIndex <= fromPlayerIndex) {
        nextRound += 1;
        newLogs.unshift(createLog('系统', `⏰ === 第 ${nextRound} 轮家庭大富翁开始 ===`));
      }

      const nextPlayer = currentPlayers[nextPlayerIndex];
      newLogs.unshift(createLog('行动', `👉 轮到【${nextPlayer.name}】(${nextPlayer.isAI ? 'AI' : '玩家'}) 行动！`));

      // Check Rounds mode game-over condition
      const isGameOver = mode === 'ROUNDS' && nextRound > maxRounds;
      let winner: Player | undefined = undefined;

      if (isGameOver) {
        const scoredPlayers = [...currentPlayers].sort((a, b) => {
          const aWealth =
            a.money + a.properties.reduce((sum, pid) => sum + getPropertyValue(currentBoard[pid]), 0);
          const bWealth =
            b.money + b.properties.reduce((sum, pid) => sum + getPropertyValue(currentBoard[pid]), 0);
          return bWealth - aWealth;
        });
        winner = scoredPlayers[0];
        const winnerWealth =
          winner.money +
          winner.properties.reduce((sum, pid) => sum + getPropertyValue(currentBoard[pid]), 0);
        newLogs.unshift(
          createLog(
            '系统',
            `🏆 【游戏结束】达到设定 ${maxRounds} 轮！恭喜 ${winner.name} 以总资产 ${winnerWealth} 金币荣登家庭首富宝座！`
          )
        );
      }

      setGameState((prev) => ({
        ...prev,
        players: currentPlayers,
        board: currentBoard,
        currentPlayerIndex: nextPlayerIndex,
        logs: newLogs.slice(0, 30),
        round: nextRound,
        isGameOver,
        winner,
        isMovingPawn: false,
      }));

      isTurnProcessingRef.current = false;
    },
    []
  );

  // Handler when human player confirms building a house
  const confirmBuildHouse = useCallback(() => {
    if (!buildModal.show || buildModal.propertyIndex === -1) return;

    setGameState((prev) => {
      const playerIndex = prev.currentPlayerIndex;
      let player = { ...prev.players[playerIndex] };
      const propertyIndex = buildModal.propertyIndex;
      const property = { ...prev.board[propertyIndex] };
      const newLogs = [...prev.logs];

      if (player.money < buildModal.cost && prev.gameMode === 'ROUNDS') {
        player.money += 300;
        player.loans += 1;
        newLogs.unshift(
          createLog(
            '事件',
            `🏦【爱心银行】${player.name} 资金不足 100 金币，银行发放 300 金币爱心扶持贷款！`
          )
        );
      }

      player.money -= buildModal.cost;
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

      const levelDesc = newLevel === 5 ? '五星豪华旅馆 🏨' : `第 ${newLevel} 栋小房子 🏠`;
      newLogs.unshift(
        createLog(
          '交易',
          `🔨 ${player.name} 在【${property.name}】成功建造了${levelDesc}（花费 ${buildModal.cost} 金币）！`
        )
      );

      // Close modal
      setBuildModal({
        show: false,
        property: null,
        propertyIndex: -1,
        cost: 100,
        nextLevel: 1,
        nextLevelName: '',
      });

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
      }, 100);

      return {
        ...prev,
        players: newPlayers,
        board: newBoard,
        logs: newLogs.slice(0, 30),
      };
    });
  }, [buildModal, advanceTurn]);

  // Handler when human player skips building
  const skipBuildHouse = useCallback(() => {
    if (!buildModal.show) return;

    setGameState((prev) => {
      const playerIndex = prev.currentPlayerIndex;
      const player = prev.players[playerIndex];
      const property = buildModal.property;

      const newLogs = [
        createLog('行动', `⏭️ ${player.name} 选择跳过在【${property?.name || '此处'}】建房。`),
        ...prev.logs,
      ];

      setBuildModal({
        show: false,
        property: null,
        propertyIndex: -1,
        cost: 100,
        nextLevel: 1,
        nextLevelName: '',
      });

      setTimeout(() => {
        advanceTurn(
          prev.players,
          prev.board,
          newLogs,
          prev.round,
          prev.maxRounds,
          playerIndex,
          prev.gameMode
        );
      }, 100);

      return {
        ...prev,
        logs: newLogs.slice(0, 30),
      };
    });
  }, [buildModal, advanceTurn]);

  // Handler when user confirms AI action result notice
  const confirmAiNotice = useCallback(() => {
    if (!aiNoticeModal.show) return;

    setAiNoticeModal({
      show: false,
      aiName: '',
      actionText: '',
      detailText: '',
      isBuild: false,
    });

    setGameState((prev) => {
      advanceTurn(
        prev.players,
        prev.board,
        prev.logs,
        prev.round,
        prev.maxRounds,
        prev.currentPlayerIndex,
        prev.gameMode
      );
      return prev;
    });
  }, [aiNoticeModal.show, advanceTurn]);

  // Handler when user confirms rent payment notice modal
  const confirmRent = useCallback(() => {
    if (!rentModal.show) return;

    setRentModal({
      show: false,
      payerName: '',
      receiverName: '',
      amount: 0,
      propertyName: '',
      houseLevel: 0,
      isBankrupt: false,
    });

    setGameState((prev) => {
      advanceTurn(
        prev.players,
        prev.board,
        prev.logs,
        prev.round,
        prev.maxRounds,
        prev.currentPlayerIndex,
        prev.gameMode
      );
      return prev;
    });
  }, [rentModal.show, advanceTurn]);

  // Resolve tile after piece finishes step-by-step walk
  const resolveLandingTile = useCallback(
    (playerIndex: number, finalPos: number) => {
      setGameState((prev: GameState) => {
        let player = { ...prev.players[playerIndex] };
        const square = prev.board[finalPos];
        const newLogs = [...prev.logs];
        const newBoard = [...prev.board];
        const newPlayers = [...prev.players];

        newLogs.unshift(createLog('行动', `📍 ${player.name} 抵达【${square.name}】`));

        const isPropertySquare =
          square.type === 'shop' ||
          square.type === 'empty' ||
          square.type === 'farm' ||
          square.type === 'bookstore' ||
          square.type === 'dessert';

        let willPauseForModal = false;

        if (square.type === 'start') {
          player.money += 100;
          newLogs.unshift(
            createLog('事件', `🎁 ${player.name} 停留在起点，领取家庭年终奖 100 金币！`)
          );
        } else if (square.type === 'chance') {
          const card = CHANCE_CARDS[Math.floor(Math.random() * CHANCE_CARDS.length)];
          setActiveChanceCard(card);
          player.money += card.amount;
          newLogs.unshift(createLog('事件', `✨【机会卡·${card.title}】${card.desc}`));
        } else if (square.type === 'tax') {
          const taxAmount = 60;
          if (prev.gameMode === 'BANKRUPTCY' && player.money < taxAmount) {
            // Bankruptcy in bankruptcy mode
            player.money = 0;
            player.isBankrupt = true;
            // release properties
            newBoard.forEach((b) => {
              if (b.owner === playerIndex) {
                b.owner = undefined;
                b.houseLevel = 0;
              }
            });
            player.properties = [];
            newLogs.unshift(
              createLog('事件', `💥【破产出局】${player.name} 无力缴纳税款，遗憾破产淘汰！`)
            );
          } else {
            player.money -= taxAmount;
            newLogs.unshift(
              createLog('事件', `🏛️ ${player.name} 到达税务局，缴纳公共建设税 ${taxAmount} 金币。`)
            );
          }
        } else if (square.type === 'park') {
          newLogs.unshift(
            createLog('事件', `🌳 ${player.name} 在绿意盎然的公园野餐长椅小憩，心旷神怡。`)
          );
        } else if (isPropertySquare) {
          // Property Square Handling:
          if (square.owner === undefined) {
            // Unowned Property: Buy if affordable
            const canBuy = player.isAI
              ? player.money >= square.price + 100
              : player.money >= square.price;
            if (canBuy) {
              player.money -= square.price;
              player.properties = [...player.properties, finalPos];
              newBoard[finalPos] = { ...square, owner: playerIndex };
              newLogs.unshift(
                createLog(
                  '交易',
                  `🏡 ${player.name} 买下地产【${square.name}】（花费 ${square.price} 金币）！成为该地块所有者。`
                )
              );
            } else {
              newLogs.unshift(createLog('行动', `👀 ${player.name} 途经空地【${square.name}】，未购买土地。`));
            }
          } else if (square.owner !== playerIndex) {
            // Owned by another player: Pay Rent directly based on house level (NO BUILD MODAL)
            const ownerIndex = square.owner;
            const owner = { ...newPlayers[ownerIndex] };
            const rent = square.rent + square.houseLevel * 45;

            const houseText =
              square.houseLevel >= 5
                ? '五星豪华旅馆'
                : square.houseLevel > 0
                ? `${square.houseLevel}栋房屋`
                : '基础地皮';

            willPauseForModal = true;
            let isPlayerBankrupt = false;

            if (prev.gameMode === 'BANKRUPTCY' && player.money < rent) {
              // Player goes bankrupt in bankruptcy mode!
              isPlayerBankrupt = true;
              const paid = Math.max(0, player.money);
              owner.money += paid;
              player.money = 0;
              player.isBankrupt = true;
              // Release bankrupt player's other properties
              newBoard.forEach((b) => {
                if (b.owner === playerIndex) {
                  b.owner = undefined;
                  b.houseLevel = 0;
                }
              });
              player.properties = [];
              newPlayers[ownerIndex] = owner;
              newLogs.unshift(
                createLog(
                  '租金',
                  `💥【破产出局】${player.name} 现金不足支付租金 ${rent} 金币给 ${owner.name}，不幸破产出局！`
                )
              );
            } else {
              player.money -= rent;
              owner.money += rent;
              newPlayers[ownerIndex] = owner;
              newLogs.unshift(
                createLog(
                  '租金',
                  `💸 ${player.name} 停留在【${square.name}】(${owner.name}名下·${houseText})，支付租金 ${rent} 金币！`
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
          } else {
            // Landed on OWN property: ONLY the owner can build/upgrade!
            const currentSquareState = newBoard[finalPos];

            if (player.isAI) {
              // AI landed on its OWN property: auto evaluate and pop up notice
              if (currentSquareState.houseLevel < 5) {
                willPauseForModal = true;
                const canAiBuild = player.money >= 200;

                if (canAiBuild) {
                  player.money -= 100;
                  const nextLvl = currentSquareState.houseLevel + 1;
                  newBoard[finalPos] = { ...currentSquareState, houseLevel: nextLvl };
                  const lvlDesc = nextLvl === 5 ? '五星豪华旅馆 🏨' : `第 ${nextLvl} 栋房屋 🏠`;
                  newLogs.unshift(
                    createLog(
                      '交易',
                      `🔨 AI玩家【${player.name}】在自家产业【${square.name}】选择【建造房屋】！`
                    )
                  );

                  setAiNoticeModal({
                    show: true,
                    aiName: player.name,
                    actionText: `AI玩家【${player.name}】，选择【建造房屋】`,
                    detailText: `在自家地产【${square.name}】投资 100 金币，升级为${lvlDesc}！`,
                    isBuild: true,
                  });
                } else {
                  newLogs.unshift(
                    createLog(
                      '行动',
                      `⏭️ AI玩家【${player.name}】在自家产业【${square.name}】选择【不建造房屋】。`
                    )
                  );

                  setAiNoticeModal({
                    show: true,
                    aiName: player.name,
                    actionText: `AI玩家【${player.name}】，选择【不建造房屋】`,
                    detailText: `在自家地产【${square.name}】决定观望，保留现金不进行建房。`,
                    isBuild: false,
                  });
                }
              } else {
                newLogs.unshift(
                  createLog('行动', `🏨 AI玩家【${player.name}】巡视自家【${square.name}】豪华旅馆，已达满级！`)
                );
              }
            } else {
              // Human landed on OWN property: POP UP BUILD MODAL
              if (currentSquareState.houseLevel < 5) {
                willPauseForModal = true;
                const nextLvl = currentSquareState.houseLevel + 1;
                const nextLvlName = nextLvl === 5 ? '五星豪华旅馆 🏨' : `第 ${nextLvl} 栋房屋 🏠`;

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
                    `🔨 ${player.name} 停留在自家地产【${currentSquareState.name}】，是否在此建造房屋？`
                  )
                );
              } else {
                newLogs.unshift(
                  createLog('行动', `🏨 【${currentSquareState.name}】已达到五星豪华旅馆满级，无法再升级！`)
                );
              }
            }
          }
        }

        // Check soft relief loan in Rounds Mode
        player = checkAndApplyLoan(player, newLogs, prev.gameMode);
        newPlayers[playerIndex] = player;

        // If no modal paused the turn, advance after a short pacing delay
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
      setGameState((prev: GameState) => {
        if (prev.isGameOver || prev.players.length === 0) {
          isTurnProcessingRef.current = false;
          return prev;
        }

        const playerIndex = prev.currentPlayerIndex;
        const player = prev.players[playerIndex];
        const oldPos = player.position;

        const newLogs = [
          createLog('行动', `🎲 ${player.name} 掷出 ${steps} 点，棋子开始步步前进...`),
          ...prev.logs,
        ];

        // Begin step-by-step movement interval
        let stepCount = 0;
        let currentPos = oldPos;

        if (movementTimerRef.current) {
          clearInterval(movementTimerRef.current);
          movementTimerRef.current = null;
        }

        movementTimerRef.current = setInterval(() => {
          stepCount += 1;
          currentPos = (currentPos + 1) % 24;

          setGameState((currentState) => {
            const updatedPlayers = [...currentState.players];
            const updatedLogs = [...currentState.logs];

            // Passed start salary bonus check during walking
            if (currentPos === 0) {
              const movingPlayer = { ...updatedPlayers[playerIndex] };
              movingPlayer.money += 150;
              updatedPlayers[playerIndex] = movingPlayer;
              updatedLogs.unshift(
                createLog('事件', `🚩 ${movingPlayer.name} 途径起点，领取薪水补贴 150 金币！`)
              );
            }

            updatedPlayers[playerIndex] = {
              ...updatedPlayers[playerIndex],
              position: currentPos,
            };

            return {
              ...currentState,
              players: updatedPlayers,
              logs: updatedLogs.slice(0, 30),
              isMovingPawn: true,
            };
          });

          // Arrived at destination
          if (stepCount >= steps) {
            if (movementTimerRef.current) {
              clearInterval(movementTimerRef.current);
              movementTimerRef.current = null;
            }

            // Wait 280ms pause at final tile before triggering tile events
            setTimeout(() => {
              resolveLandingTile(playerIndex, currentPos);
            }, 280);
          }
        }, 220); // 220ms per square step walk

        return {
          ...prev,
          logs: newLogs.slice(0, 30),
          isMovingPawn: true,
        };
      });
    },
    [resolveLandingTile]
  );

  // AI Automated Turn Controller
  useEffect(() => {
    if (
      isSetup ||
      gameState.isGameOver ||
      gameState.players.length === 0 ||
      showDiceModal.show ||
      buildModal.show ||
      aiNoticeModal.show ||
      rentModal.show ||
      gameState.isMovingPawn ||
      isTurnProcessingRef.current
    ) {
      return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer && currentPlayer.isAI && !currentPlayer.isBankrupt) {
      isTurnProcessingRef.current = true;

      aiTimerRef.current = setTimeout(() => {
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;

        // Show dice modal with roll animation for visual clarity
        setShowDiceModal({ show: true, dice: [d1, d2], isRolling: true });

        setTimeout(() => {
          setShowDiceModal({ show: true, dice: [d1, d2], isRolling: false });

          // Auto-confirm after rolling completes
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
    isSetup,
    gameState.isGameOver,
    gameState.isMovingPawn,
    showDiceModal.show,
    buildModal.show,
    aiNoticeModal.show,
    rentModal.show,
    executeMove,
  ]);

  return {
    gameState,
    isSetup,
    setupGame,
    resetToSetup,
    showDiceModal,
    setShowDiceModal,
    executeMove,
    buildModal,
    confirmBuildHouse,
    skipBuildHouse,
    aiNoticeModal,
    confirmAiNotice,
    rentModal,
    confirmRent,
    activeChanceCard,
    setActiveChanceCard,
    isTurnProcessing: isTurnProcessingRef.current,
  };
};
