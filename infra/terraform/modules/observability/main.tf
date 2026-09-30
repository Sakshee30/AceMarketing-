locals {
  tags = merge(var.tags, { ManagedBy = "terraform", Module = "observability" })
}

resource "aws_cloudwatch_log_group" "service" {
  for_each = var.services

  name              = "/ace/${var.name}/${each.value}"
  retention_in_days = var.log_retention_days
  tags              = local.tags
}

resource "aws_cloudwatch_log_group" "audit" {
  name              = "/ace/${var.name}/audit"
  retention_in_days = max(var.log_retention_days, 90)
  tags              = merge(local.tags, { DataClass = "audit" })
}
