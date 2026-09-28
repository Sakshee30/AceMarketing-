import type {ReactNode} from 'react'

type BrandProps={dark?:boolean;children?:ReactNode}

export function Brand({dark=false}:BrandProps){
  return <div className={'ace-brand '+(dark?'dark':'')}><span className="ace-mark"><i/><i/><i/></span><b>AceMarketing</b></div>
}

export default Brand
