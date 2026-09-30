variable "name" { type = string }

variable "evidence_retention_days" {
  type        = number
  description = "Retention for security evidence objects before lifecycle expiry."
  default     = 365
}

variable "tags" {
  type    = map(string)
  default = {}
}
