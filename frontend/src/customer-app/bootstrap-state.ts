export type BootstrapState<User=unknown>=
  |{kind:'session-resolving'}
  |{kind:'signed-out';message:string}
  |{kind:'access-ready';user:User}
  |{kind:'recoverable-error';message:string;requestId?:string}

export const bootstrapState={
  resolving:<User=unknown>():BootstrapState<User>=>({kind:'session-resolving'}),
  signedOut:<User=unknown>(message:string):BootstrapState<User>=>({kind:'signed-out',message}),
  ready:<User=unknown>(user:User):BootstrapState<User>=>({kind:'access-ready',user}),
  recoverable:<User=unknown>(message:string,requestId?:string):BootstrapState<User>=>({
    kind:'recoverable-error',
    message,
    ...(requestId?{requestId}:{})
  })
}
