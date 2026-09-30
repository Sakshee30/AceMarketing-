module "network" {
  source = "../../../modules/network"

  name                = "ace-${var.environment}"
  vpc_cidr            = var.vpc_cidr
  availability_zones  = var.availability_zones
  enable_nat_gateway  = var.enable_nat_gateway

  tags = {
    BlastRadius = "nonproduction"
    CostCenter  = "ace-marketing"
  }
}
