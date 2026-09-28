import {api} from '../../../lib/api'

export const customer360Api={
  load:(id?:string)=>api.customer360(id)
}
