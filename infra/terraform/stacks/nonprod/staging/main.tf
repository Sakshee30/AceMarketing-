module "network" {
  source = "../../../modules/network"

  name               = "ace-${var.environment}"
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  enable_nat_gateway = var.enable_nat_gateway

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

  name   = "ace-${var.environment}"
  vpc_id = module.network.vpc_id
  tags   = local.service_tags
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
    "runtime/google-ai-api-key",
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
  services           = ["api", "integration-ingress", "realtime", "control-api", "worker", "workflow-worker", "webhook-worker", "ai-document-worker", "scheduler"]
  tags               = local.service_tags
}

module "backup" {
  source = "../../../modules/backup"

  name = "ace-${var.environment}"
  tags = local.service_tags
}

module "security_baseline" {
  source = "../../../modules/security-baseline"

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

module "edge" {
  source = "../../../modules/edge"

  name                   = "ace-${var.environment}"
  vpc_id                 = module.network.vpc_id
  public_subnet_ids      = module.network.public_subnet_ids
  application_subnet_ids = module.network.application_subnet_ids
  task_security_group_id = module.compute.task_security_group_id
  allowed_control_cidrs  = var.control_allowed_cidrs
  enable_https           = var.enable_https
  certificate_arn        = var.certificate_arn
  tags                   = local.service_tags
}

module "vpc_endpoints" {
  source = "../../../modules/vpc-endpoints"

  name                        = "ace-${var.environment}"
  vpc_id                      = module.network.vpc_id
  aws_region                  = var.aws_region
  application_subnet_ids      = module.network.application_subnet_ids
  application_route_table_ids = module.network.application_route_table_ids
  allowed_security_group_ids  = [module.compute.task_security_group_id]
  tags                        = local.service_tags
}

data "aws_iam_policy_document" "ecs_task_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "api_task" {
  name_prefix        = "ace-${var.environment}-api-"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
  tags               = merge(local.service_tags, { Service = "api" })
}

resource "aws_iam_role" "control_task" {
  name_prefix        = "ace-${var.environment}-control-"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
  tags               = merge(local.service_tags, { Service = "control-api" })
}

resource "aws_iam_role" "integration_task" {
  name_prefix        = "ace-${var.environment}-integration-"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
  tags               = merge(local.service_tags, { Service = "integration-ingress" })
}

resource "aws_iam_role" "realtime_task" {
  name_prefix        = "ace-${var.environment}-realtime-"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
  tags               = merge(local.service_tags, { Service = "realtime" })
}

resource "aws_iam_role" "worker_task" {
  name_prefix        = "ace-${var.environment}-worker-"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
  tags               = merge(local.service_tags, { Service = "worker" })
}

resource "aws_iam_role" "workflow_worker_task" {
  name_prefix        = "ace-${var.environment}-workflow-worker-"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
  tags               = merge(local.service_tags, { Service = "workflow-worker" })
}

resource "aws_iam_role" "webhook_worker_task" {
  name_prefix        = "ace-${var.environment}-webhook-worker-"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
  tags               = merge(local.service_tags, { Service = "webhook-worker" })
}

resource "aws_iam_role" "ai_document_worker_task" {
  name_prefix        = "ace-${var.environment}-ai-document-worker-"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
  tags               = merge(local.service_tags, { Service = "ai-document-worker" })
}

resource "aws_iam_role" "scheduler_task" {
  name_prefix        = "ace-${var.environment}-scheduler-"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
  tags               = merge(local.service_tags, { Service = "scheduler" })
}

data "aws_iam_policy_document" "api_task" {
  statement {
    sid = "Objects"
    actions = [
      "s3:GetObject",
      "s3:GetObjectVersion",
      "s3:PutObject",
      "s3:AbortMultipartUpload",
      "s3:ListBucket"
    ]
    resources = [module.object_storage.bucket_arn, "${module.object_storage.bucket_arn}/*"]
  }

  statement {
    sid       = "JobAdmission"
    actions   = ["sqs:SendMessage", "sqs:GetQueueAttributes"]
    resources = [module.queue.queue_arn]
  }

  statement {
    sid       = "RuntimeSecrets"
    actions   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    resources = values(module.secrets.secret_arns)
  }

  statement {
    sid       = "DecryptRuntimeSecrets"
    actions   = ["kms:Decrypt"]
    resources = [module.secrets.kms_key_arn]
  }
}

resource "aws_iam_role_policy" "api_task" {
  name   = "runtime-capabilities"
  role   = aws_iam_role.api_task.id
  policy = data.aws_iam_policy_document.api_task.json
}

data "aws_iam_policy_document" "control_task" {
  statement {
    sid       = "RuntimeSecrets"
    actions   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    resources = values(module.secrets.secret_arns)
  }

  statement {
    sid       = "DecryptRuntimeSecrets"
    actions   = ["kms:Decrypt"]
    resources = [module.secrets.kms_key_arn]
  }
}

resource "aws_iam_role_policy" "control_task" {
  name   = "runtime-capabilities"
  role   = aws_iam_role.control_task.id
  policy = data.aws_iam_policy_document.control_task.json
}

data "aws_iam_policy_document" "integration_task" {
  statement {
    sid       = "RuntimeSecrets"
    actions   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    resources = values(module.secrets.secret_arns)
  }

  statement {
    sid       = "DecryptRuntimeSecrets"
    actions   = ["kms:Decrypt"]
    resources = [module.secrets.kms_key_arn]
  }
}

resource "aws_iam_role_policy" "integration_task" {
  name   = "runtime-capabilities"
  role   = aws_iam_role.integration_task.id
  policy = data.aws_iam_policy_document.integration_task.json
}

data "aws_iam_policy_document" "realtime_task" {
  statement {
    sid     = "RuntimeSecrets"
    actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    resources = [
      module.secrets.secret_arns["runtime/database-url"],
      module.secrets.secret_arns["runtime/google-ai-api-key"]
    ]
  }

  statement {
    sid       = "DecryptRuntimeSecrets"
    actions   = ["kms:Decrypt"]
    resources = [module.secrets.kms_key_arn]
  }
}

resource "aws_iam_role_policy" "realtime_task" {
  name   = "runtime-capabilities"
  role   = aws_iam_role.realtime_task.id
  policy = data.aws_iam_policy_document.realtime_task.json
}

data "aws_iam_policy_document" "worker_task" {
  statement {
    sid = "Objects"
    actions = [
      "s3:GetObject",
      "s3:GetObjectVersion",
      "s3:PutObject",
      "s3:AbortMultipartUpload",
      "s3:ListBucket"
    ]
    resources = [module.object_storage.bucket_arn, "${module.object_storage.bucket_arn}/*"]
  }

  statement {
    sid = "DurableJobs"
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:ChangeMessageVisibility",
      "sqs:GetQueueAttributes"
    ]
    resources = [module.queue.queue_arn, module.queue.dead_letter_queue_arn]
  }

  statement {
    sid       = "RuntimeSecrets"
    actions   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    resources = values(module.secrets.secret_arns)
  }

  statement {
    sid       = "DecryptRuntimeSecrets"
    actions   = ["kms:Decrypt"]
    resources = [module.secrets.kms_key_arn]
  }
}

resource "aws_iam_role_policy" "worker_task" {
  name   = "runtime-capabilities"
  role   = aws_iam_role.worker_task.id
  policy = data.aws_iam_policy_document.worker_task.json
}

data "aws_iam_policy_document" "workflow_worker_task" {
  statement {
    sid = "DurableJobs"
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:ChangeMessageVisibility",
      "sqs:GetQueueAttributes"
    ]
    resources = [module.queue.queue_arn, module.queue.dead_letter_queue_arn]
  }

  statement {
    sid       = "RuntimeSecrets"
    actions   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    resources = values(module.secrets.secret_arns)
  }

  statement {
    sid       = "DecryptRuntimeSecrets"
    actions   = ["kms:Decrypt"]
    resources = [module.secrets.kms_key_arn]
  }
}

resource "aws_iam_role_policy" "workflow_worker_task" {
  name   = "runtime-capabilities"
  role   = aws_iam_role.workflow_worker_task.id
  policy = data.aws_iam_policy_document.workflow_worker_task.json
}

data "aws_iam_policy_document" "webhook_worker_task" {
  statement {
    sid = "DurableJobs"
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:ChangeMessageVisibility",
      "sqs:GetQueueAttributes"
    ]
    resources = [module.queue.queue_arn, module.queue.dead_letter_queue_arn]
  }

  statement {
    sid       = "RuntimeSecrets"
    actions   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    resources = values(module.secrets.secret_arns)
  }

  statement {
    sid       = "DecryptRuntimeSecrets"
    actions   = ["kms:Decrypt"]
    resources = [module.secrets.kms_key_arn]
  }
}

resource "aws_iam_role_policy" "webhook_worker_task" {
  name   = "runtime-capabilities"
  role   = aws_iam_role.webhook_worker_task.id
  policy = data.aws_iam_policy_document.webhook_worker_task.json
}

data "aws_iam_policy_document" "ai_document_worker_task" {
  statement {
    sid = "Objects"
    actions = [
      "s3:GetObject",
      "s3:GetObjectVersion",
      "s3:PutObject",
      "s3:AbortMultipartUpload",
      "s3:ListBucket"
    ]
    resources = [module.object_storage.bucket_arn, "${module.object_storage.bucket_arn}/*"]
  }

  statement {
    sid = "DurableJobs"
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:ChangeMessageVisibility",
      "sqs:GetQueueAttributes"
    ]
    resources = [module.queue.queue_arn, module.queue.dead_letter_queue_arn]
  }

  statement {
    sid       = "RuntimeSecrets"
    actions   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    resources = values(module.secrets.secret_arns)
  }

  statement {
    sid       = "DecryptRuntimeSecrets"
    actions   = ["kms:Decrypt"]
    resources = [module.secrets.kms_key_arn]
  }
}

resource "aws_iam_role_policy" "ai_document_worker_task" {
  name   = "runtime-capabilities"
  role   = aws_iam_role.ai_document_worker_task.id
  policy = data.aws_iam_policy_document.ai_document_worker_task.json
}

data "aws_iam_policy_document" "scheduler_task" {
  statement {
    sid       = "JobAdmission"
    actions   = ["sqs:SendMessage", "sqs:GetQueueAttributes"]
    resources = [module.queue.queue_arn]
  }

  statement {
    sid       = "RuntimeSecrets"
    actions   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    resources = values(module.secrets.secret_arns)
  }

  statement {
    sid       = "DecryptRuntimeSecrets"
    actions   = ["kms:Decrypt"]
    resources = [module.secrets.kms_key_arn]
  }
}

resource "aws_iam_role_policy" "scheduler_task" {
  name   = "runtime-capabilities"
  role   = aws_iam_role.scheduler_task.id
  policy = data.aws_iam_policy_document.scheduler_task.json
}

data "aws_iam_policy_document" "ecs_execution_secrets" {
  statement {
    actions   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    resources = values(module.secrets.secret_arns)
  }

  statement {
    actions   = ["kms:Decrypt"]
    resources = [module.secrets.kms_key_arn]
  }
}

resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name   = "runtime-secret-injection"
  role   = module.compute.execution_role_name
  policy = data.aws_iam_policy_document.ecs_execution_secrets.json
}

locals {
  common_runtime_environment = {
    NODE_ENV                = "production"
    ACE_RUNTIME_ENVIRONMENT = var.environment
    AWS_REGION              = var.aws_region
    OBJECT_S3_BUCKET        = module.object_storage.bucket_name
    JOB_QUEUE_URL           = module.queue.queue_url
  }

  common_runtime_secrets = {
    DATABASE_URL             = module.secrets.secret_arns["runtime/database-url"]
    CONNECTOR_ENCRYPTION_KEY = module.secrets.secret_arns["runtime/connector-encryption"]
  }
}

module "api_service" {
  source = "../../../modules/ecs-service"

  name               = "ace-${var.environment}-api"
  cluster_arn        = module.compute.cluster_arn
  subnet_ids         = module.network.application_subnet_ids
  security_group_ids = [module.compute.task_security_group_id]
  execution_role_arn = module.compute.execution_role_arn
  task_role_arn      = aws_iam_role.api_task.arn
  image              = var.api_image
  container_port     = 3001
  target_group_arn   = module.edge.api_target_group_arn
  log_group_name     = module.observability.log_group_names["api"]
  aws_region         = var.aws_region
  desired_count      = 3
  min_capacity       = 3
  max_capacity       = 30
  environment        = merge(local.common_runtime_environment, { ACE_SERVICE_NAME = "api" })
  secrets            = local.common_runtime_secrets
  tags               = local.service_tags
}

module "integration_ingress_service" {
  source = "../../../modules/ecs-service"

  name               = "ace-${var.environment}-integration-ingress"
  cluster_arn        = module.compute.cluster_arn
  subnet_ids         = module.network.application_subnet_ids
  security_group_ids = [module.compute.task_security_group_id]
  execution_role_arn = module.compute.execution_role_arn
  task_role_arn      = aws_iam_role.integration_task.arn
  image              = var.api_image
  container_port     = 3001
  target_group_arn   = module.edge.integration_target_group_arn
  log_group_name     = module.observability.log_group_names["integration-ingress"]
  aws_region         = var.aws_region
  desired_count      = 2
  min_capacity       = 2
  max_capacity       = 20
  cpu_target_percent = 60
  environment        = merge(local.common_runtime_environment, { ACE_SERVICE_NAME = "integration-ingress", ACE_RUNTIME_ROLE = "integration-ingress" })
  secrets            = local.common_runtime_secrets
  tags               = local.service_tags
}

module "realtime_service" {
  source = "../../../modules/ecs-service"

  name               = "ace-${var.environment}-realtime"
  cluster_arn        = module.compute.cluster_arn
  subnet_ids         = module.network.application_subnet_ids
  security_group_ids = [module.compute.task_security_group_id]
  execution_role_arn = module.compute.execution_role_arn
  task_role_arn      = aws_iam_role.realtime_task.arn
  image              = var.worker_image
  command            = ["node", "backend/src/realtime.mjs"]
  container_port     = 3003
  target_group_arn   = module.edge.realtime_target_group_arn
  log_group_name     = module.observability.log_group_names["realtime"]
  aws_region         = var.aws_region
  desired_count      = 2
  min_capacity       = 2
  max_capacity       = 12
  cpu_target_percent = 60
  environment        = merge(local.common_runtime_environment, { ACE_SERVICE_NAME = "realtime", REALTIME_PORT = "3003" })
  secrets = {
    DATABASE_URL      = module.secrets.secret_arns["runtime/database-url"]
    GOOGLE_AI_API_KEY = module.secrets.secret_arns["runtime/google-ai-api-key"]
  }
  tags = local.service_tags
}

module "control_api_service" {
  source = "../../../modules/ecs-service"

  name               = "ace-${var.environment}-control"
  cluster_arn        = module.compute.cluster_arn
  subnet_ids         = module.network.application_subnet_ids
  security_group_ids = [module.compute.task_security_group_id]
  execution_role_arn = module.compute.execution_role_arn
  task_role_arn      = aws_iam_role.control_task.arn
  image              = var.control_api_image
  container_port     = 3002
  target_group_arn   = module.edge.control_target_group_arn
  log_group_name     = module.observability.log_group_names["control-api"]
  aws_region         = var.aws_region
  desired_count      = 3
  min_capacity       = 3
  max_capacity       = 12
  environment        = merge(local.common_runtime_environment, { ACE_SERVICE_NAME = "control-api", CONTROL_PORT = "3002" })
  secrets            = local.common_runtime_secrets
  tags               = local.service_tags
}

module "worker_service" {
  source = "../../../modules/ecs-service"

  name                     = "ace-${var.environment}-worker"
  cluster_arn              = module.compute.cluster_arn
  subnet_ids               = module.network.application_subnet_ids
  security_group_ids       = [module.compute.task_security_group_id]
  execution_role_arn       = module.compute.execution_role_arn
  task_role_arn            = aws_iam_role.worker_task.arn
  image                    = var.worker_image
  log_group_name           = module.observability.log_group_names["worker"]
  aws_region               = var.aws_region
  desired_count            = 3
  min_capacity             = 3
  max_capacity             = 24
  cpu_target_percent       = 65
  readonly_root_filesystem = false
  environment              = merge(local.common_runtime_environment, { ACE_SERVICE_NAME = "worker", WORKER_CLASS = "general", WORKER_RUN_SCHEDULERS = "false" })
  secrets                  = local.common_runtime_secrets
  tags                     = local.service_tags
}

module "workflow_worker_service" {
  source = "../../../modules/ecs-service"

  name                     = "ace-${var.environment}-workflow-worker"
  cluster_arn              = module.compute.cluster_arn
  subnet_ids               = module.network.application_subnet_ids
  security_group_ids       = [module.compute.task_security_group_id]
  execution_role_arn       = module.compute.execution_role_arn
  task_role_arn            = aws_iam_role.workflow_worker_task.arn
  image                    = var.worker_image
  log_group_name           = module.observability.log_group_names["workflow-worker"]
  aws_region               = var.aws_region
  desired_count            = 2
  min_capacity             = 2
  max_capacity             = 16
  cpu_target_percent       = 60
  readonly_root_filesystem = true
  environment              = merge(local.common_runtime_environment, { ACE_SERVICE_NAME = "workflow-worker", WORKER_CLASS = "workflow", WORKER_RUN_SCHEDULERS = "false" })
  secrets                  = local.common_runtime_secrets
  tags                     = local.service_tags
}

module "webhook_worker_service" {
  source = "../../../modules/ecs-service"

  name                     = "ace-${var.environment}-webhook-worker"
  cluster_arn              = module.compute.cluster_arn
  subnet_ids               = module.network.application_subnet_ids
  security_group_ids       = [module.compute.task_security_group_id]
  execution_role_arn       = module.compute.execution_role_arn
  task_role_arn            = aws_iam_role.webhook_worker_task.arn
  image                    = var.worker_image
  log_group_name           = module.observability.log_group_names["webhook-worker"]
  aws_region               = var.aws_region
  desired_count            = 2
  min_capacity             = 2
  max_capacity             = 12
  cpu_target_percent       = 60
  readonly_root_filesystem = true
  environment              = merge(local.common_runtime_environment, { ACE_SERVICE_NAME = "webhook-worker", WORKER_CLASS = "webhook", WORKER_RUN_SCHEDULERS = "false" })
  secrets                  = local.common_runtime_secrets
  tags                     = local.service_tags
}

module "ai_document_worker_service" {
  source = "../../../modules/ecs-service"

  name                     = "ace-${var.environment}-ai-document-worker"
  cluster_arn              = module.compute.cluster_arn
  subnet_ids               = module.network.application_subnet_ids
  security_group_ids       = [module.compute.task_security_group_id]
  execution_role_arn       = module.compute.execution_role_arn
  task_role_arn            = aws_iam_role.ai_document_worker_task.arn
  image                    = var.worker_image
  log_group_name           = module.observability.log_group_names["ai-document-worker"]
  aws_region               = var.aws_region
  desired_count            = 2
  min_capacity             = 2
  max_capacity             = 12
  cpu_target_percent       = 65
  readonly_root_filesystem = false
  environment              = merge(local.common_runtime_environment, { ACE_SERVICE_NAME = "ai-document-worker", WORKER_CLASS = "ai-document", WORKER_RUN_SCHEDULERS = "false" })
  secrets                  = local.common_runtime_secrets
  tags                     = local.service_tags
}

module "scheduler_service" {
  source = "../../../modules/ecs-service"

  name                     = "ace-${var.environment}-scheduler"
  cluster_arn              = module.compute.cluster_arn
  subnet_ids               = module.network.application_subnet_ids
  security_group_ids       = [module.compute.task_security_group_id]
  execution_role_arn       = module.compute.execution_role_arn
  task_role_arn            = aws_iam_role.scheduler_task.arn
  image                    = var.worker_image
  command                  = ["node", "backend/src/scheduler.mjs"]
  log_group_name           = module.observability.log_group_names["scheduler"]
  aws_region               = var.aws_region
  desired_count            = 1
  min_capacity             = 1
  max_capacity             = 1
  cpu_target_percent       = 70
  readonly_root_filesystem = true
  environment              = merge(local.common_runtime_environment, { ACE_SERVICE_NAME = "scheduler" })
  secrets                  = local.common_runtime_secrets
  tags                     = local.service_tags
}
