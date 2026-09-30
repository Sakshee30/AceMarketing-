variable "name" { type = string }
variable "resource_tag_key" {
  type    = string
  default = "Backup"
}
variable "resource_tag_value" {
  type    = string
  default = "required"
}
variable "daily_retention_days" {
  type    = number
  default = 35
}
variable "tags" {
  type    = map(string)
  default = {}
}
