import {api as sharedApi} from '../../../lib/api'

export const deliveryApi={
  signalDeliveries:()=>sharedApi.signalDeliveries(),
  connectorHealth:()=>sharedApi.connectorHealth(),
  retrySignalDelivery:(id:string)=>sharedApi.retrySignalDelivery(id),
  replaySignalDlq:()=>sharedApi.replaySignalDlq(),
  dispatchSignal:(payload:Record<string,unknown>)=>sharedApi.dispatchSignal(payload)
}
