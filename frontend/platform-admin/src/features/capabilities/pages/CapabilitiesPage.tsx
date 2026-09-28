import {ControlReadOnlyPage} from '../../../components/ControlReadOnlyPage'
import type {ControlReadResult} from '../../../lib/control-api'
export default function CapabilitiesPage(props:{result:ControlReadResult|null;loading:boolean;onRefresh:()=>void}){return <ControlReadOnlyPage title="Capabilities" responsibility="Desired and observed capability state, provider, criticality, fallback and migration risk." {...props}/>}
