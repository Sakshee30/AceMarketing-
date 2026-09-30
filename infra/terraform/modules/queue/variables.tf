variable "name" { type = string }
variable "visibility_timeout_seconds" {
  type    = number
  default = 60
}
variable "message_retention_seconds" {
  type    = number
  default = 1209600
}
variable "max_receive_count" {
  type    = number
  default = 5
}
variable "kms_key_id" {
  type    = string
  default = "alias/aws/sqs"
}
variable "tags" {
  type    = map(string)
  default = {}
}
