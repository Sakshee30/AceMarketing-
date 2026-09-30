output "vpc_id" {
  value       = aws_vpc.this.id
  description = "VPC identifier."
}

output "public_subnet_ids" {
  value       = aws_subnet.public[*].id
  description = "Public ingress subnet identifiers."
}

output "application_subnet_ids" {
  value       = aws_subnet.application[*].id
  description = "Private application subnet identifiers."
}

output "data_subnet_ids" {
  value       = aws_subnet.data[*].id
  description = "Isolated data subnet identifiers."
}

output "nat_gateway_ids" {
  value       = aws_nat_gateway.this[*].id
  description = "NAT gateway identifiers when enabled."
}
