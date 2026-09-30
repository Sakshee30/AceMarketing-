# AceMarketing infrastructure

This directory is the canonical Terraform foundation for AceMarketing. It is additive to the existing deployment files and does not replace the current runtime pipeline.

## State and credentials

Terraform state must use an encrypted, access-controlled remote backend with locking. Supply backend configuration at initialization time; do not commit bucket names, credentials, secrets, or state files here.

Use short-lived federated AWS credentials for human operators and scoped workload/deployment identities for automation. Do not store long-lived AWS administrator keys in the repository, containers, or frontend artifacts.

## Stacks

The first adopted stack is `stacks/nonprod/staging`. It composes the reusable multi-AZ network module with separate public ingress, private application, and isolated data subnet tiers.

Initialize with an approved backend configuration and provide the target Region and availability zones explicitly. A plan is evidence, not authorization to apply. Production stacks must be introduced through reviewed change records, capacity/quota evidence, and recovery controls.

## Cost note

The network module creates one NAT gateway per availability zone by default to avoid a single-AZ egress dependency. NAT has real cost. Nonproduction environments may disable NAT only when their workload and required endpoints can operate safely without it.
