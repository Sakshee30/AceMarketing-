variable "name" { type = string }
variable "vpc_id" { type = string }
variable "ingress_security_group_ids" {
  type        = list(string)
  description = "Security groups allowed to reach application task ports."
  default     = []
}
variable "application_ports" {
  type    = set(number)
  default = [3001, 3002]
}
variable "enable_container_insights" {
  type    = bool
  default = true
}
variable "tags" {
  type    = map(string)
  default = {}
}
