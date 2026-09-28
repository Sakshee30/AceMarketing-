export type ControlPageKey='overview'|'capabilities'|'features'|'providers'|'environments'|'dependencies'|'infrastructure'|'deployments'|'changes'|'health'|'observability'|'security'|'secrets'|'costs'|'backup-dr'|'drift'|'audit'|'emergency'

export type ControlPageManifest={
  key:ControlPageKey
  label:string
  responsibility:string
}

export const controlPages:ControlPageManifest[]=[
  {key:'overview',label:"Overview",responsibility:"Platform/cell health, active release, configuration version and critical alerts."},
  {key:'capabilities',label:"Capabilities",responsibility:"Desired and observed capability state, provider, criticality, fallback and migration risk."},
  {key:'features',label:"Features",responsibility:"Product flags and allowed tenant/workspace overrides."},
  {key:'providers',label:"Providers",responsibility:"Provider catalog, contract compatibility, health and capacity."},
  {key:'environments',label:"Environments",responsibility:"Development, test, staging, production and recovery scope."},
  {key:'dependencies',label:"Dependencies",responsibility:"Validated dependency graph and impact analysis."},
  {key:'infrastructure',label:"Infrastructure",responsibility:"Desired and observed resources, ownership and safe lifecycle status."},
  {key:'deployments',label:"Deployments",responsibility:"Artifact, configuration and migration versions with rollout state."},
  {key:'changes',label:"Changes",responsibility:"Operational change requests, validation, approvals, execution and verification."},
  {key:'health',label:"Health",responsibility:"Services, workers, queues, dead-letter queues, integrations and partial degradation."},
  {key:'observability',label:"Observability",responsibility:"SLOs, dashboards, traces and incident correlation."},
  {key:'security',label:"Security",responsibility:"Findings, access reviews, policy checks and locked controls."},
  {key:'secrets',label:"Secrets",responsibility:"Secret metadata, rotation and configuration health; never plaintext values."},
  {key:'costs',label:"Costs",responsibility:"Allocated cost, usage, estimates and anomaly investigation."},
  {key:'backup-dr',label:"Backup & DR",responsibility:"Backup status, restore evidence and declared RPO/RTO."},
  {key:'drift',label:"Drift",responsibility:"Versioned desired state versus observed cloud/deployment state."},
  {key:'audit',label:"Audit",responsibility:"Attributable operational history and approved evidence access."},
  {key:'emergency',label:"Emergency",responsibility:"Scoped freeze, read-only and maintenance controls with explicit policy boundaries."}
]
