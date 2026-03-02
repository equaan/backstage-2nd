variable "aws_region" {
    description = "AWS region for all resources."
    default     = "${{values.aws_region}}"
}

variable "project_name" {
    description = "Shared project/company identifier."
    default     = "${{values.project_name}}"
}

variable "client_name" {
    description = "Shared client identifier."
    default     = "${{values.client_name}}"
}

variable "environment" {
    description = "Shared environment identifier (e.g., dev, staging, prod)."
    default     = "${{values.environment}}"
}
 