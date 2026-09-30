output "vpc_id" {
  value = module.network.vpc_id
}

output "public_subnet_ids" {
  value = module.network.public_subnet_ids
}

output "application_subnet_ids" {
  value = module.network.application_subnet_ids
}

output "data_subnet_ids" {
  value = module.network.data_subnet_ids
}


output "ecs_cluster_name" {
  value = module.compute.cluster_name
}

output "database_endpoint" {
  value = module.database.endpoint
}

output "object_bucket_name" {
  value = module.object_storage.bucket_name
}

output "job_queue_url" {
  value = module.queue.queue_url
}

output "backup_vault_name" {
  value = module.backup.vault_name
}

output "service_log_groups" {
  value = module.observability.log_group_names
}


output "api_alb_dns_name" {
  value = module.edge.api_alb_dns_name
}

output "control_alb_dns_name" {
  value = module.edge.control_alb_dns_name
}

output "api_service_name" {
  value = module.api_service.service_name
}

output "control_api_service_name" {
  value = module.control_api_service.service_name
}

output "worker_service_name" {
  value = module.worker_service.service_name
}

output "vpc_endpoint_ids" {
  value = module.vpc_endpoints.interface_endpoint_ids
}


output "security_evidence_bucket" {
  value = module.security_baseline.evidence_bucket_name
}

output "cloudtrail_arn" {
  value = module.security_baseline.cloudtrail_arn
}

output "guardduty_detector_id" {
  value = module.security_baseline.guardduty_detector_id
}


output "webhook_worker_service_name" {
  value = module.webhook_worker_service.service_name
}

output "ai_document_worker_service_name" {
  value = module.ai_document_worker_service.service_name
}

output "scheduler_service_name" {
  value = module.scheduler_service.service_name
}


output "integration_ingress_service_name" {
  value = module.integration_ingress_service.service_name
}


output "realtime_service_name" {
  value = module.realtime_service.service_name
}

output "workflow_worker_service_name" {
  value = module.workflow_worker_service.service_name
}
