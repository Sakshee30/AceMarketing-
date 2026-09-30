locals {
  tags = merge(var.tags, { ManagedBy = "terraform", Module = "secrets" })
}

resource "aws_kms_key" "secrets" {
  description             = "${var.name} application secret encryption"
  enable_key_rotation     = true
  deletion_window_in_days = 30
  tags                    = local.tags
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${var.name}-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}

resource "aws_secretsmanager_secret" "this" {
  for_each = var.secret_names

  name                    = "${var.name}/${each.value}"
  kms_key_id              = aws_kms_key.secrets.arn
  recovery_window_in_days = var.recovery_window_days
  tags                    = local.tags
}
