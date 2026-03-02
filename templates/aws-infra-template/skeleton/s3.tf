resource "aws_s3_bucket" "app_storage" {
  bucket = "${{ values.client_name }}-${{ values.environment }}-storage"

  tags = {
    Environment = "${{ values.environment }}"
    Project     = "${{ values.project_name }}"
  }
}

resource "aws_s3_bucket_public_access_block" "app_storage_block" {
  bucket = aws_s3_bucket.app_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}