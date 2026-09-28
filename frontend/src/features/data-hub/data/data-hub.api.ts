import {api} from '../../../lib/api'

export const dataHubApi={
  load:()=>api.dataHub(),
  rebuild:()=>api.rebuildDataHub()
}
