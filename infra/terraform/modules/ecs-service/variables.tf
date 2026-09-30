variable "name" { type = string }
variable "cluster_arn" { type = string }
variable "subnet_ids" { type = list(string) }
variable "security_group_ids" { type = list(string) }
variable "execution_role_arn" { type = string }
variable "task_role_arn" { type = string }
variable "image" { type = string }
variable "container_port" {
  type    = number
  default = null
}
variable "target_group_arn" {
  type    = string
  default = null
}
variable "log_group_name" { type = string }
variable "aws_region" { type = string }
variable "cpu" {
  type    = number
  default = 512
}
variable "memory" {
  type    = number
  default = 1024
}
variable "desired_count" {
  type    = number
  default = 3
}
variable "min_capacity" {
  type    = number
  default = 3
}
variable "max_capacity" {
  type    = number
  default = 12
}
variable "cpu_target_percent" {
  type    = number
  default = 60
}
variable "health_check_grace_seconds" {
  type    = number
  default = 60
}
variable "command" {
  type    = list(string)
  default = null
}
variable "environment" {
  type    = map(string)
  default = {}
}
variable "secrets" {
  type    = map(string)
  default = {}
}
variable "deployment_minimum_healthy_percent" {
  type    = number
  default = 100
}
variable "deployment_maximum_percent" {
  type    = number
  default = 200
}
variable "tags" {
  type    = map(string)
  default = {}
}
