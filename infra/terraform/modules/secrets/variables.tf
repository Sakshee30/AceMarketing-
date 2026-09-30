variable "name" { type = string }
variable "secret_names" {
  type        = set(string)
  description = "Secret containers to create. Values are populated out of band."
  default     = []
}
variable "recovery_window_days" {
  type    = number
  default = 30
}
variable "tags" {
  type    = map(string)
  default = {}
}
