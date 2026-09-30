locals {
  tags = merge(var.tags, { ManagedBy = "terraform", Module = "queue" })
}

resource "aws_sqs_queue" "dead_letter" {
  name                      = "${var.name}-jobs-dlq"
  message_retention_seconds = var.message_retention_seconds
  kms_master_key_id         = var.kms_key_id
  tags                      = merge(local.tags, { QueueRole = "dead-letter" })
}

resource "aws_sqs_queue" "jobs" {
  name                       = "${var.name}-jobs"
  visibility_timeout_seconds = var.visibility_timeout_seconds
  message_retention_seconds  = var.message_retention_seconds
  kms_master_key_id          = var.kms_key_id

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dead_letter.arn
    maxReceiveCount     = var.max_receive_count
  })

  tags = merge(local.tags, { QueueRole = "jobs" })
}
