variable "name" { type = string }
variable "services" {
  type    = set(string)
  default = ["api", "control-api", "worker"]
}
variable "log_retention_days" {
  type    = number
  default = 30
}
variable "tags" {
  type    = map(string)
  default = {}
}
