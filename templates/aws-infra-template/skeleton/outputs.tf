output "vpc_id" {
  value = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "rds_hostname" {
  value = module.db.db_instance_address
}

output "s3_bucket_name" {
  value = aws_s3_bucket.app_storage.id
}