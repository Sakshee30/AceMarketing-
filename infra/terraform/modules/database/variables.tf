variable "name" { type = string }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }
variable "allowed_security_group_ids" {
  type    = list(string)
  default = []
}
variable "engine_version" {
  type    = string
  default = "16.4"
}
variable "instance_class" {
  type    = string
  default = "db.t4g.medium"
}
variable "allocated_storage_gb" {
  type    = number
  default = 100
}
variable "max_allocated_storage_gb" {
  type    = number
  default = 500
}
variable "backup_retention_days" {
  type    = number
  default = 14
}
variable "multi_az" {
  type    = bool
  default = true
}
variable "deletion_protection" {
  type    = bool
  default = true
}
variable "tags" {
  type    = map(string)
  default = {}
}
