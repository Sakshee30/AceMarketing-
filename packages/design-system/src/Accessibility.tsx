import type {ReactNode} from 'react'

export function SkipLink({href='#main-content',children='Skip to main content'}:{href?:string;children?:ReactNode}){
  return <a className="ace-skip-link" href={href}>{children}</a>
}

export function AccessibilityRoot({id='main-content',children,className=''}:{id?:string;children:ReactNode;className?:string}){
  return <div id={id} tabIndex={-1} className={('ace-a11y-root '+className).trim()}>{children}</div>
}
