module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~>19.15"

  cluster_name    = "${{ values.client_name }}-${{ values.environment }}-eks"
  cluster_version = "1.30"

  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  cluster_endpoint_public_access = true

  eks_managed_node_groups = {
    general = {
      desired_size = 2
      min_size     = 2
      max_size     = 3

      instance_types = ["t2.micro"]
      capacity_type  = "ON_DEMAND"
    }
  }
}