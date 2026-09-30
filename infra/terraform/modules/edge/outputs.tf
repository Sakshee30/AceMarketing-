output "api_alb_dns_name" { value = aws_lb.api.dns_name }
output "control_alb_dns_name" { value = aws_lb.control.dns_name }
output "api_target_group_arn" { value = aws_lb_target_group.api.arn }
output "integration_target_group_arn" { value = aws_lb_target_group.integration.arn }
output "control_target_group_arn" { value = aws_lb_target_group.control.arn }
output "api_alb_security_group_id" { value = aws_security_group.api_alb.id }
output "control_alb_security_group_id" { value = aws_security_group.control_alb.id }
output "web_acl_arn" { value = aws_wafv2_web_acl.api.arn }
