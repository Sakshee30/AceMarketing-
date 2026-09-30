output "endpoint" {
  value       = aws_db_instance.this.address
  description = "Database hostname."
}

output "port" {
  value       = aws_db_instance.this.port
  description = "Database port."
}

output "security_group_id" {
  value       = aws_security_group.database.id
  description = "Database security group."
}

output "master_user_secret_arn" {
  value       = try(aws_db_instance.this.master_user_secret[0].secret_arn, null)
  description = "AWS-managed master credential secret ARN."
  sensitive   = true
}
