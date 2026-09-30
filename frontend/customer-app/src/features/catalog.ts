import {accountFeatureManifest} from './account/feature.manifest'
import {organizationsFeatureManifest} from './organizations/feature.manifest'
import {workspacesFeatureManifest} from './workspaces/feature.manifest'
import {onboardingFeatureManifest} from './onboarding/feature.manifest'
import {teamFeatureManifest} from './team/feature.manifest'
import {rolesFeatureManifest} from './roles/feature.manifest'
import {boardsFeatureManifest} from './boards/feature.manifest'
import {workflowsFeatureManifest} from './workflows/feature.manifest'
import {documentsFeatureManifest} from './documents/feature.manifest'
import {integrationsFeatureManifest} from './integrations/feature.manifest'
import {notificationsFeatureManifest} from './notifications/feature.manifest'
import {searchFeatureManifest} from './search/feature.manifest'
import {billingFeatureManifest} from './billing/feature.manifest'
import {usageFeatureManifest} from './usage/feature.manifest'
import {auditFeatureManifest} from './audit/feature.manifest'
import {settingsFeatureManifest} from './settings/feature.manifest'
import {aiFeatureManifest} from './ai/feature.manifest'

export const customerFoundationFeatureCatalog=Object.freeze([
  accountFeatureManifest,
  organizationsFeatureManifest,
  workspacesFeatureManifest,
  onboardingFeatureManifest,
  teamFeatureManifest,
  rolesFeatureManifest,
  boardsFeatureManifest,
  workflowsFeatureManifest,
  documentsFeatureManifest,
  integrationsFeatureManifest,
  notificationsFeatureManifest,
  searchFeatureManifest,
  billingFeatureManifest,
  usageFeatureManifest,
  auditFeatureManifest,
  settingsFeatureManifest,
  aiFeatureManifest
])

export const customerFoundationFeatureById=new Map(customerFoundationFeatureCatalog.map(item=>[item.id,item]))
