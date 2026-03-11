How To Add A New AWS Service (e.g. EKS)

You only touch one file: AwsResourcePicker.tsx. Three small additions:

---------------------------------------------------------------------------------------------
Step 1 — Add to SERVICE_DEFINITIONS array:
const SERVICE_DEFINITIONS = [
  { id: 'vpc',  label: 'VPC', description: '...', color: '#FF9900' },
  { id: 'ec2',  label: 'EC2', description: '...', color: '#FF4F8B' },
  { id: 's3',   label: 'S3',  description: '...', color: '#3F8624' },
  { id: 'rds',  label: 'RDS', description: '...', color: '#527FFF' },

  // ← ADD THIS:
  { id: 'eks',  label: 'EKS', description: 'Elastic Kubernetes Service', color: '#FF6B35' },
];
This makes the checkbox appear in the UI automatically.

--------------------------------------------------------------------------------------------------------------
Step 2 — Add its config interface field:
interface ResourceConfig {
  vpc_cidr?: string;
  ec2_instance_type?: string;
  s3_versioning?: boolean;
  rds_engine?: string;
  eks_version?: string;   // ← ADD THIS
}

-----------------------------------------------------------------------------------------------------------------
Step 3 — Add its config component:
const EksConfig = ({ config, onChange, classes }) => (
  <FormControl className={classes.configField} variant="outlined" size="small">
    <InputLabel>Kubernetes Version</InputLabel>
    <Select
      value={config.eks_version ?? '1.28'}
      onChange={e => onChange({ ...config, eks_version: e.target.value })}
      label="Kubernetes Version"
    >
      <MenuItem value="1.28">1.28</MenuItem>
      <MenuItem value="1.29">1.29</MenuItem>
    </Select>
  </FormControl>
);

------------------------------------------------------------------------------------------------------------------------------
Step 4 — Wire it in the render block:
{service.id === 'eks' && (
  <EksConfig config={config} onChange={handleConfigChange} classes={classes} />
)}

------------------------------------------------------------------------------------------------------------------------------
Step 5 — Add the fetch step in template.yaml:
- id: fetch-terraform-eks
  name: Fetch Terraform EKS
  if: ${{ ... and parameters.iac_resources.resources.includes('eks') }}
  action: fetch:template
  input:
    url: https://github.com/equaan/company-assets/tree/main/iac/terraform/eks
    targetPath: ./iac/terraform/eks
    values:
      eks_version: ${{ parameters.iac_resources.config.eks_version }}

That's it. No combinations, no oneOf, no page restructuring. Just one new service definition, one config field, one small component, and one template step.