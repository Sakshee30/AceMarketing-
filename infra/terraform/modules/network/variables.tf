variable "name" {
  type        = string
  description = "Resource name prefix."
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC."
}

variable "availability_zones" {
  type        = list(string)
  description = "Availability zones used by the stack."

  validation {
    condition     = length(var.availability_zones) >= 3
    error_message = "At least three availability zones are required by the baseline network profile."
  }
}

variable "enable_nat_gateway" {
  type        = bool
  description = "Create one NAT gateway per availability zone for private application egress."
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to all resources."
  default     = {}
}
