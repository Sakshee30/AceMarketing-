import {ControlReadOnlyPage} from '../../../components/ControlReadOnlyPage'
import type {ControlReadResult} from '../../../lib/control-api'
export default function SecurityPage(props:{result:ControlReadResult|null;loading:boolean;onRefresh:()=>void}){return <ControlReadOnlyPage title="Security" responsibility="Findings, access reviews, policy checks and locked controls." {...props}/>}
