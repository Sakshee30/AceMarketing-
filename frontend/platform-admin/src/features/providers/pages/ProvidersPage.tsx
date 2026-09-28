import {ControlReadOnlyPage} from '../../../components/ControlReadOnlyPage'
import type {ControlReadResult} from '../../../lib/control-api'
export default function ProvidersPage(props:{result:ControlReadResult|null;loading:boolean;onRefresh:()=>void}){return <ControlReadOnlyPage title="Providers" responsibility="Provider catalog, contract compatibility, health and capacity." {...props}/>}
