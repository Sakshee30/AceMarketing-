import {ControlReadOnlyPage} from '../../../components/ControlReadOnlyPage'
import type {ControlReadResult} from '../../../lib/control-api'
export default function DependenciesPage(props:{result:ControlReadResult|null;loading:boolean;onRefresh:()=>void}){return <ControlReadOnlyPage title="Dependencies" responsibility="Validated dependency graph and impact analysis." {...props}/>}
