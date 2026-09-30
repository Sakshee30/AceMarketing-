locals {
  tags = merge(var.tags, { ManagedBy = "terraform", Module = "backup" })
}

resource "aws_kms_key" "backup" {
  description             = "${var.name} backup vault encryption"
  enable_key_rotation     = true
  deletion_window_in_days = 30
  tags                    = local.tags
}

resource "aws_backup_vault" "this" {
  name        = "${var.name}-vault"
  kms_key_arn = aws_kms_key.backup.arn
  tags        = local.tags
}

resource "aws_backup_plan" "this" {
  name = "${var.name}-daily"

  rule {
    rule_name         = "daily"
    target_vault_name = aws_backup_vault.this.name
    schedule          = "cron(0 3 * * ? *)"

    lifecycle {
      delete_after = var.daily_retention_days
    }
  }

  tags = local.tags
}

data "aws_iam_policy_document" "assume_backup" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["backup.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "backup" {
  name_prefix        = "${var.name}-backup-"
  assume_role_policy = data.aws_iam_policy_document.assume_backup.json
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "backup" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_backup_selection" "tagged" {
  name         = "${var.name}-tagged"
  iam_role_arn = aws_iam_role.backup.arn
  plan_id      = aws_backup_plan.this.id

  selection_tag {
    type  = "STRINGEQUALS"
    key   = var.resource_tag_key
    value = var.resource_tag_value
  }
}
