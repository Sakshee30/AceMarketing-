variable "aws_region" {
  type        = string
  description = "AWS Region for the staging environment."
}

variable "environment" {
  type        = string
  description = "Deployment environment."
  default     = "staging"

  validation {
    condition     = var.environment == "staging"
    error_message = "This stack is reserved for staging."
  }
}

variable "owner" {
  type        = string
  description = "Operational owner tag."
  default     = "platform"
}

variable "vpc_cidr" {
  type        = string
  description = "Staging VPC CIDR."
  default     = "10.40.0.0/16"
}

variable "availability_zones" {
  type        = list(string)
  description = "Three preferred availability zones for staging."
}

variable "enable_nat_gateway" {
  type        = bool
  description = "Whether staging private application subnets receive outbound NAT."
  default     = true
}


variable "database_instance_class" {
  type        = string
  description = "Staging PostgreSQL instance class."
  default     = "db.t4g.medium"
}

variable "database_engine_version" {
  type        = string
  description = "Pinned PostgreSQL engine version for staging."
  default     = "16.4"
}

variable "log_retention_days" {
  type        = number
  description = "CloudWatch application log retention."
  default     = 30
}


variable "api_image" {
  type        = string
  description = "Immutable API container image reference."
}

variable "control_api_image" {
  type        = string
  description = "Immutable platform control API container image reference."
}

variable "worker_image" {
  type        = string
  description = "Immutable background worker container image reference."
}

variable "control_allowed_cidrs" {
  type        = list(string)
  description = "CIDRs allowed to reach the internal platform-control ALB."
  default     = ["10.40.0.0/16"]
}

variable "enable_https" {
  type        = bool
  description = "Enable TLS listeners when an ACM certificate is supplied."
  default     = false
}

variable "certificate_arn" {
  type        = string
  description = "ACM certificate ARN used by staging ALB listeners when HTTPS is enabled."
  default     = null
}
