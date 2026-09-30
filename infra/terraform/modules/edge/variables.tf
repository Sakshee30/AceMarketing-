variable "name" { type = string }
variable "vpc_id" { type = string }
variable "public_subnet_ids" { type = list(string) }
variable "application_subnet_ids" { type = list(string) }
variable "task_security_group_id" { type = string }

variable "api_port" {
  type    = number
  default = 3001
}
variable "control_port" {
  type    = number
  default = 3002
}
variable "realtime_port" {
  type    = number
  default = 3003
}
variable "api_health_path" {
  type    = string
  default = "/api/health"
}
variable "control_health_path" {
  type    = string
  default = "/healthz"
}
variable "integration_health_path" {
  type    = string
  default = "/healthz"
}
variable "realtime_health_path" {
  type    = string
  default = "/healthz"
}
variable "certificate_arn" {
  type    = string
  default = null
}
variable "enable_https" {
  type    = bool
  default = false
}
variable "allowed_control_cidrs" {
  type    = list(string)
  default = ["10.0.0.0/8"]
}
variable "api_rate_limit_per_5m" {
  type    = number
  default = 10000
}
variable "tags" {
  type    = map(string)
  default = {}
}
