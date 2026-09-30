output "evidence_bucket_name" {
  value = aws_s3_bucket.evidence.id
}

output "cloudtrail_arn" {
  value = aws_cloudtrail.this.arn
}

output "guardduty_detector_id" {
  value = aws_guardduty_detector.this.id
}

output "securityhub_enabled" {
  value = true
}
