import {ControlReadOnlyPage} from '../../../components/ControlReadOnlyPage'
import type {ControlReadResult} from '../../../lib/control-api'
export default function SecretsPage(props:{result:ControlReadResult|null;loading:boolean;onRefresh:()=>void}){return <ControlReadOnlyPage title="Secrets" responsibility="Secret metadata, rotation and configuration health; never plaintext values." {...props}/>}
