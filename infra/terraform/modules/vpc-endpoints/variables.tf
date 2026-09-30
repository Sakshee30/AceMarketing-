variable "name" { type = string }
variable "vpc_id" { type = string }
variable "aws_region" { type = string }
variable "application_subnet_ids" { type = list(string) }
variable "application_route_table_ids" { type = list(string) }
variable "allowed_security_group_ids" { type = list(string) }
variable "enable_interface_endpoints" {
  type    = bool
  default = true
}
variable "tags" {
  type    = map(string)
  default = {}
}
