locals {
  name_prefix = "${var.project_name}-${var.client_name}-${var.environment}"

  tags = {
    Client      = "${{ values.client_name }}"
    Environment = "${{ values.environment }}"
    Project     = "${{ values.project_name }}"
    ManagedBy   = "Backstage"
  }
}

# Fetch availability zones dynamically for the region provided
data "aws_availability_zones" "available" {
  state = "available"
}

