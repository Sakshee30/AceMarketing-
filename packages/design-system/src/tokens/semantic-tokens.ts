export const semanticTokens={
  color:{
    text:'var(--ace-text)',
    muted:'var(--ace-muted)',
    surface:'var(--ace-surface)',
    border:'var(--ace-border)',
    focus:'var(--ace-focus)',
    danger:'var(--ace-danger)',
    success:'var(--ace-success)'
  },
  spacing:{xs:'0.25rem',sm:'0.5rem',md:'1rem',lg:'1.5rem',xl:'2rem'},
  radius:{sm:'0.375rem',md:'0.625rem',lg:'0.875rem'},
  motion:{fast:'120ms',normal:'180ms'},
  density:{compact:'0.75rem',comfortable:'1rem'}
} as const

export type SemanticTokens=typeof semanticTokens
