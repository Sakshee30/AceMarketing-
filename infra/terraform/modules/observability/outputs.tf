output "log_group_names" {
  value = { for service, group in aws_cloudwatch_log_group.service : service => group.name }
}
output "audit_log_group_name" { value = aws_cloudwatch_log_group.audit.name }
