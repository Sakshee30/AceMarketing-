import {useEffect,useState} from 'react'
import {Activity,CheckCircle2,ShieldCheck,UsersRound} from 'lucide-react'
import {settingsApi as api} from '../data/settings.api'

export function UsersRolesSettings(){
 const [members,setMembers]=useState<any[]>([])
 const [email,setEmail]=useState('')
 const [role,setRole]=useState('analyst')
 const [inviteToken,setInviteToken]=useState('')
 const [busy,setBusy]=useState('')
 const [loading,setLoading]=useState(true)
 const [notice,setNotice]=useState<{kind:'ok'|'error'|'',text:string}>({kind:'',text:''})
 const load=async()=>{
  setLoading(true)
  try{
   const r:any=await api.members()
   setMembers(r.items||[])
  }catch(e:any){
   setNotice({kind:'error',text:e?.message||'Workspace members could not be loaded.'})
  }finally{setLoading(false)}
 }
 useEffect(()=>{load()},[])
 const invite=async()=>{
  if(!email.trim()){setNotice({kind:'error',text:'Enter an email address before creating an invite.'});return}
  setBusy('invite');setNotice({kind:'',text:''})
  try{
   const r:any=await api.inviteMember({email:email.trim(),role})
   if(!r?.inviteToken)throw new Error('Invite was created without a one-time activation token.')
   setInviteToken(r.inviteToken);setEmail('');setNotice({kind:'ok',text:'Member invite created and persisted.'});await load()
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Member invite could not be created.'})}
  finally{setBusy('')}
 }
 const changeRole=async(id:string,next:string)=>{
  setBusy(id);setNotice({kind:'',text:''})
  try{await api.changeMemberRole(id,next);setNotice({kind:'ok',text:'Member role updated and active sessions were refreshed.'});await load()}
  catch(e:any){setNotice({kind:'error',text:e?.message||'Member role could not be changed.'})}
  finally{setBusy('')}
 }
 const deactivate=async(id:string)=>{
  setBusy(id);setNotice({kind:'',text:''})
  try{await api.deactivateMember(id);setNotice({kind:'ok',text:'Member deactivated and active sessions were revoked.'});await load()}
  catch(e:any){setNotice({kind:'error',text:e?.message||'Member could not be deactivated.'})}
  finally{setBusy('')}
 }
 return <div className="settings-detail"><div className="panel-head"><div><h3>Users & roles</h3><p>Membership and role changes are enforced by the backend. Changing a role or deactivating a member revokes their active sessions.</p></div><button disabled={loading} onClick={load}>{loading?'Refreshing…':'Refresh members'}</button></div>
 {notice.text&&<div className={'delivery-notice '+(notice.kind==='error'?'error':'ok')} role={notice.kind==='error'?'alert':'status'}>{notice.kind==='error'?<ShieldCheck/>:<CheckCircle2/>}<span>{notice.text}</span></div>}
 <div className="setup-form-grid"><label><span>Invite email</span><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="teammate@company.com"/></label><label><span>Role</span><select value={role} onChange={e=>setRole(e.target.value)}><option value="admin">Admin</option><option value="analyst">Analyst</option><option value="operator">Operator</option></select></label></div>
 <button className="app-primary" disabled={busy==='invite'} onClick={invite}>{busy==='invite'?'Creating invite…':'Invite member'}</button>
 {inviteToken&&<div className="api-key-box"><div><span>One-time invite token</span><code>{inviteToken}</code></div><small>Copy this now and send it through your approved invitation channel. Only its hash is stored.</small></div>}
 <div className="member-role-legend">{[['Owner','Full control'],['Admin','Manage workspace, members and activation'],['Analyst','Read, analyze and export'],['Operator','Run approved operational workflows']].map(x=><span key={x[0]}><b>{x[0]}</b>{x[1]}</span>)}</div>
 {loading&&!members.length?<div className="empty-state"><Activity/><b>Loading members</b><small>Reading workspace membership and role state.</small></div>:members.length?members.map((x:any)=><div className="member-row" key={x.id}><span className="avatar-sm">{String(x.name||x.email||'?')[0].toUpperCase()}</span><div><b>{x.name||x.email}</b><small>{x.email} · {x.status}</small></div><select value={x.role} disabled={x.role==='owner'||busy===x.id} onChange={e=>changeRole(x.id,e.target.value)}><option value="owner">Owner</option><option value="admin">Admin</option><option value="analyst">Analyst</option><option value="operator">Operator</option></select>{x.role!=='owner'&&x.status==='active'&&<button disabled={busy===x.id} onClick={()=>deactivate(x.id)}>{busy===x.id?'Updating…':'Deactivate'}</button>}</div>):<div className="empty-state"><UsersRound/><b>No members available</b><small>Refresh the section or invite the first workspace member.</small></div>}
 </div>
}
