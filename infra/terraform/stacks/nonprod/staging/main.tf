module "network" {
  source = "../../../modules/network"

  name                = "ace-${var.environment}"
  vpc_cidr            = var.vpc_cidr
  availability_zones  = var.availability_zones
  enable_nat_gateway  = var.enable_nat_gateway

  tags = {
    BlastRadius = "nonproduction"
    CostCenter  = "ace-marketing"
  }
}


locals {
  service_tags = {
    Application = "ace-marketing"
    Environment = var.environment
    BlastRadius = "nonproduction"
    CostCenter  = "ace-marketing"
    Backup      = "required"
  }
}

module "compute" {
  source = "../../../modules/compute"

  name    = "ace-${var.environment}"
  vpc_id  = module.network.vpc_id
  tags    = local.service_tags
}

module "database" {
  source = "../../../modules/database"

  name                       = "ace-${var.environment}"
  vpc_id                     = module.network.vpc_id
  subnet_ids                 = module.network.data_subnet_ids
  allowed_security_group_ids = [module.compute.task_security_group_id]
  engine_version             = var.database_engine_version
  instance_class             = var.database_instance_class
  multi_az                   = true
  deletion_protection        = true
  tags                       = local.service_tags
}

module "secrets" {
  source = "../../../modules/secrets"

  name = "ace-${var.environment}"
  secret_names = [
    "runtime/database-url",
    "runtime/connector-encryption",
    "runtime/session-signing",
    "runtime/webhook-signing"
  ]
  tags = local.service_tags
}

module "object_storage" {
  source = "../../../modules/object-storage"

  name        = "ace-${var.environment}"
  kms_key_arn = module.secrets.kms_key_arn
  tags        = local.service_tags
}

module "queue" {
  source = "../../../modules/queue"

  name = "ace-${var.environment}"
  tags = local.service_tags
}

module "observability" {
  source = "../../../modules/observability"

  name               = var.environment
  log_retention_days = var.log_retention_days
  services           = ["api", "control-api", "worker", "document-worker"]
  tags               = local.service_tags
}

module "backup" {
  source = "../../../modules/backup"

  name = "ace-${var.environment}"
  tags = local.service_tags
}

data "aws_iam_policy_document" "application_runtime" {
  statement {
    sid = "ObjectStorage"
    actions = [
      "s3:GetObject",
      "s3:GetObjectVersion",
      "s3:PutObject",
      "s3:AbortMultipartUpload",
      "s3:ListBucket"
    ]
    resources = [
      module.object_storage.bucket_arn,
      "${module.object_storage.bucket_arn}/*"
    ]
  }

  statement {
    sid = "DurableJobs"
    actions = [
      "sqs:SendMessage",
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:ChangeMessageVisibility",
      "sqs:GetQueueAttributes"
    ]
    resources = [
      module.queue.queue_arn,
      module.queue.dead_letter_queue_arn
    ]
  }

  statement {
    sid       = "RuntimeSecrets"
    actions   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    resources = concat(values(module.secrets.secret_arns), [module.database.master_user_secret_arn])
  }

  statement {
    sid       = "DecryptRuntimeSecrets"
    actions   = ["kms:Decrypt"]
    resources = [module.secrets.kms_key_arn]
  }
}

resource "aws_iam_role_policy" "application_runtime" {
  name   = "runtime-capabilities"
  role   = module.compute.application_role_name
  policy = data.aws_iam_policy_document.application_runtime.json
}
