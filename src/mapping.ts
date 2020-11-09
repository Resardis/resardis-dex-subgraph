import {
  LogDeposit,
  LogItemUpdate,
  LogKill,
  LogMake,
  LogMinSell,
  LogOfferType,
  LogSetAuthority,
  LogSetOwner,
  LogSortedOffer,
  LogTake,
  LogTrade,
  LogWithdraw,
  LogOrderFilled,
  LogOrderStatus,
} from "../generated/Contract/Contract"

import {
  Deposit,
  ItemUpdate,
  Kill,
  Make,
  MinSell,
  OfferType,
  SetAuthority,
  SetOwner,
  SortedOffer,
  Take,
  Trade,
  Withdraw,
  OrderFilled,
  OrderStatus,
  ActiveOffer,
  PairTimeData,
} from "../generated/schema"

import { store, BigInt, BigDecimal } from "@graphprotocol/graph-ts"

const ONE_BI = BigInt.fromI32(1)

export function handleLogDeposit(event: LogDeposit): void {
  const deposit = new Deposit(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  deposit.token = event.params.token
  deposit.user = event.params.user
  deposit.amount = event.params.amount
  deposit.balance = event.params.balance
  deposit.save()
}

export function handleLogItemUpdate(event: LogItemUpdate): void {
  const itemupdate = new ItemUpdate(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  itemupdate.offerItemID = event.params.id
  itemupdate.save()
}

export function handleLogKill(event: LogKill): void {
  const kill = new Kill(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  kill.offerID = event.params.id
  kill.pair = event.params.pair
  kill.maker = event.params.maker
  kill.payGem = event.params.payGem
  kill.buyGem = event.params.buyGem
  kill.payAmt = event.params.payAmt
  kill.buyAmt = event.params.buyAmt
  kill.timestamp = event.params.timestamp
  kill.save()

  const killedActiveOffer = ActiveOffer.load(event.params.id.toString())
  if (killedActiveOffer != null) {
    store.remove("ActiveOffer", killedActiveOffer.id)
  }
}

export function handleLogMake(event: LogMake): void {
  const make = new Make(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  make.offerID = event.params.id
  make.pair = event.params.pair
  make.maker = event.params.maker
  make.payGem = event.params.payGem
  make.buyGem = event.params.buyGem
  make.payAmt = event.params.payAmt
  make.buyAmt = event.params.buyAmt
  make.timestamp = event.params.timestamp
  make.offerType = event.params.offerType

  make.save()

  // ActiveOffer is special, in the way that
  // offerID (integer) == TheGraph ID (string)
  // note that offerID is unique in smart contract
  const activeOffer = new ActiveOffer(event.params.id.toString())
  activeOffer.offerID = event.params.id
  activeOffer.pair = event.params.pair
  activeOffer.maker = event.params.maker
  activeOffer.payGem = event.params.payGem
  activeOffer.buyGem = event.params.buyGem
  activeOffer.payAmt = event.params.payAmt
  activeOffer.buyAmt = event.params.buyAmt
  activeOffer.timestamp = event.params.timestamp
  activeOffer.offerType = event.params.offerType

  activeOffer.save()
}

export function handleLogMinSell(event: LogMinSell): void {
  const minsell = new MinSell(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  minsell.payGem = event.params.payGem
  minsell.minAmount = event.params.minAmount
  minsell.caller = event.params.caller
  minsell.save()
}

export function handleLogOfferType(event: LogOfferType): void {
  const offertype = new OfferType(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  offertype.offerType = event.params.offerType
  offertype.state = event.params.state
  offertype.save()
}

export function handleLogSetAuthority(event: LogSetAuthority): void {
  const setauthority = new SetAuthority(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  setauthority.authority = event.params.authority
  setauthority.save()
}

export function handleLogSetOwner(event: LogSetOwner): void {
  const setowner = new SetOwner(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  setowner.owner = event.params.owner
  setowner.save()
}

export function handleLogSortedOffer(event: LogSortedOffer): void {
  const sortedoffer = new SortedOffer(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  sortedoffer.offerID = event.params.id
  sortedoffer.save()
}

export function handleLogTake(event: LogTake): void {
  const take = new Take(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  take.offerID = event.params.id
  take.pair = event.params.pair
  take.maker = event.params.maker
  take.payGem = event.params.payGem
  take.buyGem = event.params.buyGem
  take.taker = event.params.taker
  take.takeAmt = event.params.takeAmt
  take.giveAmt = event.params.giveAmt
  take.timestamp = event.params.timestamp
  take.offerType = event.params.offerType
  take.save()

  const takenActiveOffer = ActiveOffer.load(event.params.id.toString())
  if (takenActiveOffer != null) {
    takenActiveOffer.payAmt = takenActiveOffer.payAmt.minus(take.takeAmt)
    takenActiveOffer.buyAmt = takenActiveOffer.buyAmt.minus(take.giveAmt)
  }
}

export function handleLogTrade(event: LogTrade): void {
  const trade = new Trade(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  trade.payAmt = event.params.payAmt
  trade.payGem = event.params.payGem
  trade.buyAmt = event.params.buyAmt
  trade.buyGem = event.params.buyGem
  trade.timestamp = event.params.timestamp
  trade.save()

  const hourStr = "hour"
  const dayStr = "day"
  const timeDataTypes: string[] = ["hour", "day"]

  const ratioPayOverBuy = trade.payAmt.toBigDecimal().div(trade.buyAmt.toBigDecimal())
  const ratioBuyOverPay = trade.buyAmt.toBigDecimal().div(trade.payAmt.toBigDecimal())

  const timeDataIdBase = event.params.payGem.toHex() + "-" + event.params.buyGem.toHex()

  const hourInSeconds = BigInt.fromI32(3600)
  const hourIndex = trade.timestamp.div(hourInSeconds) // get unique hour within unix history
  const hourStartUnix = hourIndex.times(hourInSeconds) // want the rounded effect
  const hourPairID = timeDataIdBase + "-" + hourStr + "-" + hourIndex.toString()

  const dayInSeconds = BigInt.fromI32(86400)
  const dayIndex = trade.timestamp.div(dayInSeconds)
  const dayStartUnix = dayIndex.times(dayInSeconds)
  const dayPairID = timeDataIdBase + "-" + dayStr + "-" + dayIndex.toString()

  for (let i = 0; i < timeDataTypes.length; i++) {
    updateTimeData(
      timeDataTypes[i],
      ratioPayOverBuy,
      ratioBuyOverPay,
      trade,
      hourPairID,
      hourStartUnix,
      dayPairID,
      dayStartUnix
    )
  }
}

export function handleLogWithdraw(event: LogWithdraw): void {
  const withdraw = new Withdraw(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  withdraw.token = event.params.token
  withdraw.user = event.params.user
  withdraw.amount = event.params.amount
  withdraw.balance = event.params.balance
  withdraw.save()
}

export function handleLogOrderFilled(event: LogOrderFilled): void {
  const orderFilled = new OrderFilled(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  orderFilled.offerID = event.params.id
  orderFilled.save()

  const filledActiveOffer = ActiveOffer.load(event.params.id.toString())
  if (filledActiveOffer != null) {
    store.remove("ActiveOffer", filledActiveOffer.id)
  }
}

export function handleLogOrderStatus(event: LogOrderStatus): void {
  const orderStatus = new OrderStatus(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  orderStatus.offerID = event.params.id
  orderStatus.pair = event.params.pair
  orderStatus.payGem = event.params.payGem
  orderStatus.payAmt = event.params.payAmt
  orderStatus.filledPayAmt = event.params.filledPayAmt
  orderStatus.buyGem = event.params.buyGem
  orderStatus.buyAmt = event.params.buyAmt
  orderStatus.filledBuyAmt = event.params.filledBuyAmt
  orderStatus.owner = event.params.owner
  orderStatus.timestamp = event.params.timestamp
  orderStatus.cancelled = event.params.cancelled
  orderStatus.filled = event.params.filled
}

function updateTimeData(
  timeDataKey: string,
  ratioPayOverBuy: BigDecimal,
  ratioBuyOverPay: BigDecimal,
  trade: Trade,
  hourPairID: string,
  hourStartUnix: BigInt,
  dayPairID: string,
  dayStartUnix: BigInt
): void {
  let timeDataValue: PairTimeData | null

  if (timeDataKey === "hour") {
    timeDataValue = PairTimeData.load(hourPairID)
  } else if (timeDataKey === "day") {
    timeDataValue = PairTimeData.load(dayPairID)
  }

  if (timeDataValue === null) {
    if (timeDataKey === "hour") {
      timeDataValue = new PairTimeData(hourPairID)
      timeDataValue.startUnix = hourStartUnix
    } else if (timeDataKey === "day") {
      timeDataValue = new PairTimeData(dayPairID)
      timeDataValue.startUnix = dayStartUnix
    }

    timeDataValue.payGem = trade.payGem
    timeDataValue.buyGem = trade.buyGem
    timeDataValue.payAmt = trade.payAmt
    timeDataValue.buyAmt = trade.buyAmt
    timeDataValue.minPayOverBuy = ratioPayOverBuy
    timeDataValue.minBuyOverPay = ratioBuyOverPay
    timeDataValue.maxPayOverBuy = ratioPayOverBuy
    timeDataValue.maxBuyOverPay = ratioBuyOverPay
    timeDataValue.openPayOverBuy = ratioPayOverBuy
    timeDataValue.openBuyOverPay = ratioBuyOverPay
    timeDataValue.closePayOverBuy = ratioPayOverBuy
    timeDataValue.closeBuyOverPay = ratioBuyOverPay
    timeDataValue.tradeCount = ONE_BI
  } else {
    timeDataValue.payAmt = timeDataValue.payAmt.plus(trade.payAmt)
    timeDataValue.buyAmt = timeDataValue.buyAmt.plus(trade.buyAmt)

    if (ratioPayOverBuy.lt(timeDataValue.minPayOverBuy)) {
      timeDataValue.minPayOverBuy = ratioPayOverBuy
    }
    if (ratioPayOverBuy.gt(timeDataValue.maxPayOverBuy)) {
      timeDataValue.maxPayOverBuy = ratioPayOverBuy
    }
    if (ratioBuyOverPay.lt(timeDataValue.minBuyOverPay)) {
      timeDataValue.minBuyOverPay = ratioBuyOverPay
    }
    if (ratioBuyOverPay.gt(timeDataValue.maxBuyOverPay)) {
      timeDataValue.maxBuyOverPay = ratioBuyOverPay
    }

    timeDataValue.closePayOverBuy = ratioPayOverBuy
    timeDataValue.closeBuyOverPay = ratioBuyOverPay
    timeDataValue.tradeCount = timeDataValue.tradeCount.plus(ONE_BI)
  }

  timeDataValue.save()
}
