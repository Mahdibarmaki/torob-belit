/** Explicit product policies; these do not express a calibrated future probability. */
export const CANCELLATION_HISTORY_POLICY = Object.freeze({
  version: "history-v2-10-25",
  lookbackDays: 30,
  minimumKnownOperations: 10,
  minimumCoveragePercent: 80,
  lowUpperPercent: 10,
  mediumUpperPercent: 25,
});

export const RANKING_POLICY = Object.freeze({
  version: "ranking-v2-irr",
  /** Fixed reference: ۱۲٬۵۰۰٬۰۰۰ toman, stored in canonical integer rials. */
  priceReferenceRialsPerAdult: 125_000_000,
  durationReferenceMinutes: 360,
  scheduleDistanceReferenceMinutes: 360,
  weights: Object.freeze({
    price: 35,
    duration: 25,
    stops: 15,
    schedule: 10,
    baggage: 5,
    history: 10,
  }),
});
