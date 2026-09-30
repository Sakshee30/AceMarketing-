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
