export const BALANCE = {
  startingMoney: 200,
  startingHealth: 20,
  totalWaves: 50,
  /** Seconds before the first wave, and between waves. */
  firstCountdown: 10,
  waveCountdown: 6,
  sellRefund: 0.7,
  /** Armor can never reduce a hit below this fraction of its raw damage. */
  minDamageFraction: 0.25,
  scorePerReward: 10,
  waveClearBonus: 20,
} as const;
