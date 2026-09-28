import {ControlReadOnlyPage} from '../../../components/ControlReadOnlyPage'
import type {ControlReadResult} from '../../../lib/control-api'
export default function OverviewPage(props:{result:ControlReadResult|null;loading:boolean;onRefresh:()=>void}){return <ControlReadOnlyPage title="Overview" responsibility="Platform/cell health, active release, configuration version and critical alerts." {...props}/>}
