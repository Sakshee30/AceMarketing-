import {ControlReadOnlyPage} from '../../../components/ControlReadOnlyPage'
import type {ControlReadResult} from '../../../lib/control-api'
export default function EmergencyPage(props:{result:ControlReadResult|null;loading:boolean;onRefresh:()=>void}){return <ControlReadOnlyPage title="Emergency" responsibility="Scoped freeze, read-only and maintenance controls with explicit policy boundaries." {...props}/>}
