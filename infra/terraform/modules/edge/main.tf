locals {
  tags              = merge(var.tags, { ManagedBy = "terraform", Module = "edge" })
  listener_port     = var.enable_https ? 443 : 80
  listener_protocol = var.enable_https ? "HTTPS" : "HTTP"
}

resource "aws_security_group" "api_alb" {
  name_prefix = "${var.name}-api-alb-"
  description = "Public API ALB ingress"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = local.listener_port
    to_port     = local.listener_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port       = var.api_port
    to_port         = var.api_port
    protocol        = "tcp"
    security_groups = [var.task_security_group_id]
  }

  tags = local.tags
}

resource "aws_security_group" "control_alb" {
  name_prefix = "${var.name}-control-alb-"
  description = "Restricted internal control-plane ALB ingress"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = local.listener_port
    to_port     = local.listener_port
    protocol    = "tcp"
    cidr_blocks = var.allowed_control_cidrs
  }

  egress {
    from_port       = var.control_port
    to_port         = var.control_port
    protocol        = "tcp"
    security_groups = [var.task_security_group_id]
  }

  tags = local.tags
}

resource "aws_lb" "api" {
  name               = substr("${var.name}-api", 0, 32)
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.api_alb.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = true
  drop_invalid_header_fields = true

  tags = local.tags
}

resource "aws_lb" "control" {
  name               = substr("${var.name}-control", 0, 32)
  internal           = true
  load_balancer_type = "application"
  security_groups    = [aws_security_group.control_alb.id]
  subnets            = var.application_subnet_ids

  enable_deletion_protection = true
  drop_invalid_header_fields = true

  tags = merge(local.tags, { TrustBoundary = "platform-control" })
}

resource "aws_lb_target_group" "api" {
  name        = substr("${var.name}-api-tg", 0, 32)
  port        = var.api_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  health_check {
    enabled             = true
    path                = var.api_health_path
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 15
    matcher             = "200-399"
  }

  deregistration_delay = 30
  slow_start           = 30
  tags                 = local.tags
}

resource "aws_lb_target_group" "control" {
  name        = substr("${var.name}-ctl-tg", 0, 32)
  port        = var.control_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  health_check {
    enabled             = true
    path                = var.control_health_path
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 15
    matcher             = "200-399"
  }

  deregistration_delay = 30
  slow_start           = 30
  tags                 = local.tags
}

resource "aws_lb_listener" "api" {
  load_balancer_arn = aws_lb.api.arn
  port              = local.listener_port
  protocol          = local.listener_protocol
  certificate_arn   = var.enable_https ? var.certificate_arn : null
  ssl_policy        = var.enable_https ? "ELBSecurityPolicy-TLS13-1-2-2021-06" : null

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

resource "aws_lb_listener" "control" {
  load_balancer_arn = aws_lb.control.arn
  port              = local.listener_port
  protocol          = local.listener_protocol
  certificate_arn   = var.enable_https ? var.certificate_arn : null
  ssl_policy        = var.enable_https ? "ELBSecurityPolicy-TLS13-1-2-2021-06" : null

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.control.arn
  }
}

resource "aws_wafv2_web_acl" "api" {
  name  = "${var.name}-api"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedCommon"
    priority = 10

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name}-common"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "RateLimit"
    priority = 20

    action {
      block {}
    }

    statement {
      rate_based_statement {
        aggregate_key_type = "IP"
        limit              = var.api_rate_limit_per_5m
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name}-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.name}-api-web-acl"
    sampled_requests_enabled   = true
  }

  tags = local.tags
}

resource "aws_wafv2_web_acl_association" "api" {
  resource_arn = aws_lb.api.arn
  web_acl_arn  = aws_wafv2_web_acl.api.arn
}

resource "aws_vpc_security_group_ingress_rule" "tasks_from_api_alb" {
  security_group_id            = var.task_security_group_id
  referenced_security_group_id = aws_security_group.api_alb.id
  from_port                    = var.api_port
  to_port                      = var.api_port
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "tasks_from_control_alb" {
  security_group_id            = var.task_security_group_id
  referenced_security_group_id = aws_security_group.control_alb.id
  from_port                    = var.control_port
  to_port                      = var.control_port
  ip_protocol                  = "tcp"
}
