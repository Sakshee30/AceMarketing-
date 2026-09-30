locals {
  tags = merge(var.tags, { ManagedBy = "terraform", Module = "compute" })
}

resource "aws_ecs_cluster" "this" {
  name = "${var.name}-cluster"

  setting {
    name  = "containerInsights"
    value = var.enable_container_insights ? "enabled" : "disabled"
  }

  tags = local.tags
}

resource "aws_ecs_cluster_capacity_providers" "this" {
  cluster_name       = aws_ecs_cluster.this.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }
}

resource "aws_security_group" "tasks" {
  name_prefix = "${var.name}-tasks-"
  description = "Private ECS task traffic"
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
  for_each = {
    for pair in setproduct(var.ingress_security_group_ids, var.application_ports) :
    "${pair[0]}:${pair[1]}" => { source = pair[0], port = pair[1] }
  }

  security_group_id            = aws_security_group.tasks.id
  referenced_security_group_id = each.value.source
  from_port                    = each.value.port
  to_port                      = each.value.port
  ip_protocol                  = "tcp"
}

data "aws_iam_policy_document" "ecs_tasks" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "execution" {
  name_prefix        = "${var.name}-ecs-exec-"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks.json
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "application" {
  name_prefix        = "${var.name}-app-"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks.json
  tags               = local.tags
}
