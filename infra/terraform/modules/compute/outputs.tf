output "cluster_arn" { value = aws_ecs_cluster.this.arn }
output "cluster_name" { value = aws_ecs_cluster.this.name }
output "task_security_group_id" { value = aws_security_group.tasks.id }
output "execution_role_arn" { value = aws_iam_role.execution.arn }
output "application_role_arn" { value = aws_iam_role.application.arn }
output "application_role_name" { value = aws_iam_role.application.name }
output "execution_role_name" { value = aws_iam_role.execution.name }
