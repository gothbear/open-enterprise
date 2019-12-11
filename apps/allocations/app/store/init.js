import {
  app,
  getEthToken,
  getNetwork,
  getVault,
  initializeTokens,
  storeHandler,
} from '../../../../shared/store-utils'
import allocationsEventHandler from './events'

const initState = settings => async cachedState => {
  const tokens = await initializeTokens(cachedState, settings)
  //I'm unable to call 'periodDuration' even though its a public variable.
  //The following ridiculous bit of code is my roundabout way of getting that value
  const periodId = await app.call('getCurrentPeriodId').toPromise()
  const { startTime, endTime } = await app.call('getPeriod', periodId).toPromise()
  const period = endTime - startTime + 1 //Off by one second
  return {
    period,
    ...tokens
  }
}

const initialize = async () => {
  const settings = {
    ethToken: getEthToken(),
    network: await getNetwork(),
    vault: await getVault(),
  }

  const storeOptions = {
    externals: [settings.vault],
    init: initState(settings),
  }

  return storeHandler(settings, allocationsEventHandler, storeOptions)
}

export default initialize
