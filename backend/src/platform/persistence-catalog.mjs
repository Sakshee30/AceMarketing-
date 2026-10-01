const migrationTables=Object.freeze({
  '009_entitlements.sql':['ace_workspace_subscriptions','ace_usage_reservations'],
  '015_report_scheduler.sql':['ace_report_schedules','ace_report_deliveries'],
  '034_platform_reliability.sql':['ace_request_idempotency','ace_outbox_events','ace_inbox_events'],
  '035_platform_audit_catalog.sql':['ace_platform_audit'],
  '037_forms_custom_objects.sql':['ace_forms','ace_form_versions','ace_form_submissions'],
  '038_rules_workflows.sql':['ace_policy_rules','ace_policy_rule_versions','ace_policy_rule_decisions','ace_workflows','ace_workflow_versions','ace_workflow_executions','ace_workflow_approvals'],
  '039_usage_ledger.sql':['ace_usage_ledger'],
  '040_object_lifecycle.sql':['ace_objects','ace_object_access_grants'],
  '041_platform_control_changes.sql':['ace_platform_changes','ace_platform_change_approvals','ace_platform_change_events'],
  '044_runtime_configuration.sql':['ace_runtime_config_snapshots','ace_emergency_controls'],
  '045_provider_migrations.sql':['ace_provider_migrations'],
  '048_custom_objects.sql':['ace_custom_objects','ace_custom_object_versions','ace_custom_object_records'],
  '049_workflow_durable_steps.sql':['ace_workflow_execution_steps'],
  '050_webhook_delivery.sql':['ace_webhook_subscriptions','ace_webhook_deliveries','ace_webhook_delivery_attempts'],
  '051_billing_lifecycle.sql':['ace_entitlement_versions','ace_billing_reconciliation_records'],
  '052_object_processing_search.sql':['ace_object_processing_events','ace_search_documents'],
  '053_provider_migration_evidence.sql':[],
  '054_cell_placement.sql':['ace_tenant_placements'],
  '055_boards.sql':['ace_boards','ace_board_columns','ace_board_items','ace_board_operations']
})

export const tablesForMigrations=migrations=>Object.freeze([
  ...new Set((migrations||[]).flatMap(name=>migrationTables[String(name)]||[]))
])

export const migrationPersistenceCatalog=()=>Object.freeze(
  Object.entries(migrationTables).map(([migration,tables])=>Object.freeze({
    migration,
    tables:Object.freeze([...tables])
  }))
)

export const validatePersistenceCatalog=knownMigrations=>{
  const known=new Set(knownMigrations||[])
  for(const migration of known){
    if(!(migration in migrationTables))throw new Error('persistence catalogue missing migration: '+migration)
  }
  return true
}
