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
