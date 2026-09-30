locals {
  tags = merge(var.tags, { ManagedBy = "terraform", Module = "database" })
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-db"
  subnet_ids = var.subnet_ids
  tags       = local.tags
}

resource "aws_security_group" "database" {
  name_prefix = "${var.name}-db-"
  description = "PostgreSQL access from approved application security groups only"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.tags
}

resource "aws_vpc_security_group_ingress_rule" "application" {
  for_each = toset(var.allowed_security_group_ids)

  security_group_id            = aws_security_group.database.id
  referenced_security_group_id = each.value
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}

data "aws_iam_policy_document" "rds_monitoring_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["monitoring.rds.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "monitoring" {
  name_prefix        = "${var.name}-rds-monitoring-"
  assume_role_policy = data.aws_iam_policy_document.rds_monitoring_assume.json
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "monitoring" {
  role       = aws_iam_role.monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

resource "aws_db_instance" "this" {
  identifier                     = "${var.name}-postgres"
  engine                         = "postgres"
  engine_version                 = var.engine_version
  instance_class                 = var.instance_class
  allocated_storage              = var.allocated_storage_gb
  max_allocated_storage          = var.max_allocated_storage_gb
  storage_type                   = "gp3"
  storage_encrypted              = true
  db_name                        = "acemarketing"
  username                       = "ace_admin"
  manage_master_user_password    = true
  port                           = 5432
  db_subnet_group_name           = aws_db_subnet_group.this.name
  vpc_security_group_ids         = [aws_security_group.database.id]
  publicly_accessible            = false
  multi_az                       = var.multi_az
  backup_retention_period        = var.backup_retention_days
  copy_tags_to_snapshot          = true
  auto_minor_version_upgrade     = true
  deletion_protection            = var.deletion_protection
  skip_final_snapshot            = false
  final_snapshot_identifier      = "${var.name}-postgres-final"
  performance_insights_enabled   = true
  monitoring_interval            = 60
  monitoring_role_arn            = aws_iam_role.monitoring.arn
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  apply_immediately              = false

  lifecycle {
    prevent_destroy = true
  }

  tags = local.tags
}
