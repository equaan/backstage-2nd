# backstage-2nd

> Opt IT Technologies internal developer platform — powered by Backstage.io

This is the Backstage application that runs Opt IT's internal developer platform. It provides a self-service interface for DevOps engineers to onboard clients, provision infrastructure, and manage services without needing to touch code directly.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Repository Structure](#repository-structure)
- [How The Three Repos Fit Together](#how-the-three-repos-fit-together)
- [Custom Field Extensions](#custom-field-extensions)
- [Adding a New Custom Field Extension](#adding-a-new-custom-field-extension)
- [Connecting a New Template Catalog](#connecting-a-new-template-catalog)
- [app-config.yaml Reference](#app-configyaml-reference)
- [Debugging Field Extensions](#debugging-field-extensions)
- [Debugging](#debugging)
- [Common Mistakes To Avoid](#common-mistakes-to-avoid)

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- yarn
- Git
- A GitHub personal access token with `repo`, `workflow`, `read:org`, `read:user` scopes

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/equaan/backstage-2nd.git
cd backstage-2nd

# 2. Install dependencies
yarn install

# 3. Start the development server
yarn dev
```

Backstage will be available at `http://localhost:3000`.

### GitHub Token Setup

The scaffolder needs a GitHub token to open PRs on client repositories. Add it to `app-config.local.yaml` (this file is gitignored — never commit tokens):

```yaml
integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}
```

Set the environment variable before starting:

```bash
export GITHUB_TOKEN=your_token_here
yarn dev
```

**After `yarn clean`** — templates take 60-90 seconds to reload from GitHub. If they don't appear, go to `http://localhost:3000/catalog-import` and re-register:
```
https://github.com/equaan/opt-it-catalog/blob/main/catalog-info.yaml
```

---

## Repository Structure

```
backstage-2nd/
│
├── app-config.yaml                    ← main Backstage configuration
├── app-config.local.yaml              ← local overrides (gitignored — put tokens here)
│
├── packages/
│   ├── app/                           ← frontend Backstage app
│   │   └── src/
│   │       ├── App.tsx                ← app entry point + field extension registration
│   │       └── components/
│   │           ├── AwsResourcePicker/ ← custom field extension for AWS resource selection
│   │           │   ├── AwsResourcePicker.tsx
│   │           │   └── index.ts
│   │           ├── AzureResourcePicker/
│   │           │   ├── AzureResourcePicker.tsx
│   │           │   └── index.ts
│   │           ├── GcpResourcePicker/
│   │           │   ├── GcpResourcePicker.tsx
│   │           │   └── index.ts
│   │           ├── CICDPicker/
│   │           │   ├── CICDPicker.tsx
│   │           │   └── index.ts
│   │           ├── ObservabilityPicker/
│   │           │   ├── ObservabilityPicker.tsx
│   │           │   └── index.ts
│   │           ├── SecurityPicker/
│   │           │   ├── SecurityPicker.tsx
│   │           │   └── index.ts
│   │           ├── ContainerPicker/
│   │           │   ├── ContainerPicker.tsx
│   │           │   └── index.ts
│   │           ├── Root/              ← Backstage root layout
│   │           ├── catalog/           ← catalog entity pages
│   │           └── search/            ← search page
│   │
│   └── backend/                       ← Backstage backend
│       └── src/
│           └── index.ts               ← backend entry point
│
└── node_modules/                      ← installed dependencies (gitignored)
```

---

## How The Three Repos Fit Together

Opt IT's platform is split across three repositories. Understanding how they connect is essential before making changes.

```
┌─────────────────────────────────────────────────────────────┐
│                        backstage-2nd                        │
│                                                             │
│  The Backstage app. Runs locally or in production.          │
│  Contains the React frontend including custom field         │
│  extensions like AwsResourcePicker.                         │
│                                                             │
│  Reads templates from → opt-it-catalog                      │
│  Templates fetch modules from → opt-it-modules              │
└─────────────────────────────────────────────────────────────┘
                              │
                reads at runtime via URL
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        opt-it-catalog                       │
│                                                             │
│  All Backstage template.yaml files and skeleton code.       │
│  Pure YAML and Nunjucks — no compilation needed.            │
│  Backstage reads this at runtime via the catalog URL        │
│  configured in app-config.yaml.                             │
│                                                             │
│  Templates reference modules from → opt-it-modules          │
└─────────────────────────────────────────────────────────────┘
                              │
                 fetch:template steps (never fetch:plain)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        opt-it-modules                       │
│                                                             │
│  All versioned IaC modules (Terraform, CI/CD, Obs,          │
│  Security, Containers). Modules pinned via git tags.        │
│  Templates fetch specific tagged versions and copy          │
│  them into the client's repository PR.                      │
└─────────────────────────────────────────────────────────────┘
```

### What Lives Where — Quick Reference

| Thing | Where it lives |
|---|---|
| Backstage app config | `backstage-2nd/app-config.yaml` |
| Custom React components | `backstage-2nd/packages/app/src/components/` |
| Template registration | `backstage-2nd/app-config.yaml` catalog.locations |
| Template YAML files | `opt-it-catalog/templates/` |
| Skeleton files (generated code) | `opt-it-catalog/templates/{name}/skeleton/` |
| Terraform modules | `opt-it-modules/terraform/aws/`, `azure/`, `GCP/` |
| CI/CD templates | `opt-it-modules/cicd/` |
| Observability configs | `opt-it-modules/observability/` |
| Security configs | `opt-it-modules/security/` |
| Container configs | `opt-it-modules/containers/` |

---

## Custom Field Extensions

Custom field extensions are React components that behave as native Backstage form fields. They give full control over UI and the values they return.

### Current Extensions

#### `AwsResourcePicker`

**Location:** `packages/app/src/components/AwsResourcePicker/`

**What it does:** Renders a list of AWS services with checkboxes. When a service is checked, its configuration fields expand inline. Automatically selects dependencies (e.g. checking EC2 auto-checks Subnets and Security Groups).

**What it returns:**
```json
{
  "resources": "vpc_subnets_security_groups_ec2_s3",
  "config": {
    "vpc_cidr": "10.0.0.0/16",
    "public_subnet_cidrs": "10.0.1.0/24,10.0.2.0/24",
    "private_subnet_cidrs": "10.0.10.0/24,10.0.11.0/24",
    "availability_zones": "us-east-1a,us-east-1b",
    "allowed_ssh_cidrs": "",
    "rds_port": 5432,
    "ec2_instance_type": "t3.medium",
    "s3_versioning": false,
    "rds_engine": "postgres"
  }
}
```

**How to use in template.yaml:**
```yaml
iac_resources:
  title: AWS Resources
  type: object
  ui:field: AwsResourcePicker
  ui:options:
    environment: ${{ parameters.environment }}
```

**How to access values in template steps:**
```yaml
parameters.iac_resources.resources              # "vpc_ec2_s3"
parameters.iac_resources.resources.includes('vpc')  # true/false
parameters.iac_resources.config.vpc_cidr        # "10.0.0.0/16"
parameters.iac_resources.config.ec2_instance_type
```

**How to add a new service to AwsResourcePicker:**

1. Open `AwsResourcePicker.tsx`
2. Add the service to `SERVICE_DEFINITIONS`:
```typescript
{
  id: 'eks',
  label: 'EKS',
  description: 'Elastic Kubernetes Service — managed Kubernetes',
  color: '#FF6B35',
  dependsOn: ['vpc', 'subnets'],
}
```
3. Add the config interface field:
```typescript
interface ResourceConfig {
  // ...existing fields
  eks_version?: string;
}
```
4. Write the config component:
```typescript
const EksConfig = ({ config, onChange, classes }: any) => (
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
```
5. Wire it in the render block:
```typescript
{service.id === 'eks' && (
  <EksConfig config={config} onChange={handleConfigChange} classes={classes} />
)}
```
6. Build the EKS module in `opt-it-modules`
7. Add fetch step + skeleton block in `opt-it-catalog`

---

#### `AzureResourcePicker`

**Location:** `packages/app/src/components/AzureResourcePicker/`

**What it does:** Renders an Azure foundation section (location selector, subscription ID confirmation) followed by a list of Azure services with checkboxes. When a service is checked, its configuration fields expand inline. Automatically selects dependencies (e.g. checking VM auto-checks VNet and NSG).

**What it returns:**
```json
{
  "foundation": {
    "location": "eastus",
    "resource_group_suffix": "",
    "subscription_id_confirmed": true
  },
  "resources": "vnet_nsg_vm_blob",
  "config": {
    "vnet_address_space": "10.0.0.0/16",
    "public_subnet_prefixes": "10.0.1.0/24,10.0.2.0/24",
    "private_subnet_prefixes": "10.0.10.0/24,10.0.11.0/24",
    "enable_nat_gateway": false,
    "allowed_ssh_source_prefixes": "",
    "db_port": 5432,
    "vm_size": "Standard_B2s",
    "admin_username": "azureuser",
    "storage_suffix": "store",
    "account_replication_type": "LRS",
    "container_names": "default",
    "db_engine": "postgres",
    "db_version": "15",
    "sku_name": "B_Standard_B1ms",
    "high_availability_mode": "Disabled"
  }
}
```

**How to use in template.yaml:**
```yaml
azure_resources:
  title: Azure Resources
  type: object
  ui:field: AzureResourcePicker
  ui:options:
    environment: ${{ parameters.environment }}
```

**How to access values in template steps:**
```yaml
parameters.azure_resources.foundation.location
parameters.azure_resources.foundation.resource_group_suffix
parameters.azure_resources.resources                          # "vnet_nsg_vm"
parameters.azure_resources.resources.includes('vnet')         # true/false
parameters.azure_resources.config.vm_size
parameters.azure_resources.config.db_engine
```

**Validation enforced:**
- Azure location must be selected
- Engineer must confirm `ARM_SUBSCRIPTION_ID` is set
- At least one resource must be selected
- SSH from `*` or `0.0.0.0/0` is blocked at the module level

---

#### `GcpResourcePicker`

**Location:** `packages/app/src/components/GcpResourcePicker/`

**What it does:** Renders a GCP foundation section (project ID, region, zone selector, ADC confirmation) followed by GCP service checkboxes. Auto-selects dependencies.

**Key difference from AWS/Azure pickers:** Region selector auto-updates the zone dropdown. Project ID is typed directly (GCP projects are pre-existing). Auth confirmation asks engineer to confirm `gcloud auth application-default login` was run.

**What it returns:**
```json
{
  "foundation": {
    "project_id": "acme-corp-prod-123456",
    "region": "us-central1",
    "zone": "us-central1-a",
    "adc_confirmed": true
  },
  "resources": "vpc_firewall_gce",
  "config": {
    "public_subnet_cidr": "10.0.1.0/24",
    "private_subnet_cidr": "10.0.10.0/24",
    "enable_cloud_nat": true,
    "machine_type": "e2-medium",
    "db_engine": "postgres",
    "db_version": "POSTGRES_15",
    "tier": "db-f1-micro",
    "availability_type": "ZONAL"
  }
}
```

**How to use in template.yaml:**
```yaml
gcp_resources:
  title: GCP Resources
  type: object
  ui:field: GcpResourcePicker
  ui:options:
    environment: ${{ parameters.environment }}
```

---

#### `CICDPicker`

**Location:** `packages/app/src/components/CICDPicker/`

**What it does:** Checkbox list of CI/CD tools. Each tool expands inline when selected to show its specific configuration — stages for GitHub Actions/Jenkins/GitLab CI, and cluster URL/namespace/manifests path for ArgoCD.

**Tools:** GitHub Actions, Jenkins, GitLab CI, ArgoCD. Multiple tools can be selected simultaneously.

**What it returns:**
```json
{
  "tools": "GitHub Actions,Jenkins",
  "config": {
    "gh_stages": ["build", "test", "deploy"],
    "jenkins_agent": "docker",
    "jenkins_stages": ["build", "test", "deploy"],
    "gitlab_stages": ["build", "test", "deploy"],
    "argocd_cluster_url": "https://kubernetes.default.svc",
    "argocd_app_namespace": "default",
    "argocd_manifests_path": "k8s/",
    "argocd_target_revision": "HEAD",
    "argocd_prune": true,
    "argocd_self_heal": true
  }
}
```

**How to use in template.yaml:**
```yaml
cicd_config:
  title: CI/CD Configuration
  type: object
  ui:field: CICDPicker
```

**Important:** The `tools` string uses display names (`"GitHub Actions"`) not IDs. Template `if` conditions must match exactly: `parameters.cicd_config.tools.includes('GitHub Actions')`.

---

#### `ObservabilityPicker`

**Location:** `packages/app/src/components/ObservabilityPicker/`

**What it does:** Configures the full observability stack — deployment method (Docker Compose or Helm), Prometheus scrape interval and retention, Grafana port and admin password, alert rules, and notification channels (Slack webhook and/or email).

**What it returns:**
```json
{
  "config": {
    "deployment_method": "docker-compose",
    "scrape_interval": "15s",
    "retention_days": 30,
    "grafana_port": 3000,
    "grafana_admin_password": "...",
    "alert_email": "alerts@company.com",
    "slack_webhook": "https://hooks.slack.com/...",
    "slack_channel": "devops-alerts",
    "scrape_app_metrics": false,
    "app_metrics_port": 8080,
    "include_infra_alerts": true,
    "include_app_alerts": true
  }
}
```

**How to use in template.yaml:**
```yaml
obs_config:
  title: Observability Configuration
  type: object
  ui:field: ObservabilityPicker
  ui:options:
    environment: ${{ parameters.environment }}
```

**Validation enforced:** Grafana admin password is required and must be at least 8 characters.

---

#### `SecurityPicker`

**Location:** `packages/app/src/components/SecurityPicker/`

**What it does:** Toggle Trivy and OWASP scanners on/off. When enabled, each scanner shows its configuration inline — severity levels, exit codes, scan targets for Trivy; CVSS fail threshold for OWASP.

**What it returns:**
```json
{
  "config": {
    "enable_trivy": true,
    "trivy_exit_code": 1,
    "ignore_unfixed": true,
    "include_medium_severity": false,
    "scan_docker_image": false,
    "scan_iac": true,
    "enable_owasp": false,
    "owasp_fail_cvss": 7
  }
}
```

**How to use in template.yaml:**
```yaml
security_config:
  title: Security Configuration
  type: object
  ui:field: SecurityPicker
  ui:options:
    environment: ${{ parameters.environment }}
```

**Validation enforced:** At least one scanner (Trivy or OWASP) must be enabled.

---

#### `ContainerPicker`

**Location:** `packages/app/src/components/ContainerPicker/`

**What it does:** Select language (Node.js, Python, Java, Go) and runtime version. Toggle Docker Compose (with optional DB and Redis), Kubernetes manifests, and Helm chart. Configure resource limits, replica counts, domain, and container registry.

**What it returns:**
```json
{
  "config": {
    "language": "nodejs",
    "runtime_version": "20",
    "app_port": 3000,
    "health_check_path": "/health",
    "include_docker_compose": true,
    "include_database": false,
    "db_engine": "postgres",
    "db_name": "appdb",
    "db_user": "appuser",
    "include_redis": false,
    "include_kubernetes": true,
    "k8s_namespace": "default",
    "container_registry": "ghcr.io/equaan",
    "domain": "app.example.com",
    "initial_replicas": 2,
    "min_replicas": 2,
    "max_replicas": 10,
    "cpu_request": "100m",
    "memory_request": "128Mi",
    "cpu_limit": "500m",
    "memory_limit": "512Mi",
    "cpu_target_utilization": 70,
    "include_helm": true
  }
}
```

**How to use in template.yaml:**
```yaml
container_config:
  title: Container Configuration
  type: object
  ui:field: ContainerPicker
  ui:options:
    environment: ${{ parameters.environment }}
```

**Validation enforced:** Language, app port, and health check path are required.

---

## Adding a New Custom Field Extension

If you need a completely new custom field extension:

### Step 1 — Create the component

```bash
mkdir -p packages/app/src/components/MyNewPicker
```

Create `MyNewPicker.tsx` following the same pattern as `AwsResourcePicker.tsx`:
- Define the value interface
- Write the main component using `FieldExtensionComponentProps`
- Use `makeStyles` from `@material-ui/core/styles` for styling

### Step 2 — Create `index.ts`

```typescript
import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderFieldExtension } from '@backstage/plugin-scaffolder-react';
import { MyNewPicker } from './MyNewPicker';

export const myNewPickerValidation = async (
  value: { /* your value type */ },
  validation: { addError: (msg: string) => void },
) => {
  if (!value) {
    validation.addError('Please fill in the required fields.');
  }
};

export const MyNewPickerFieldExtension = scaffolderPlugin.provide(
  createScaffolderFieldExtension({
    name: 'MyNewPicker',
    component: MyNewPicker,
    validation: myNewPickerValidation,
  }),
);

export { MyNewPicker };
```

### Step 3 — Register in `App.tsx`

Open `packages/app/src/App.tsx` and add:

```typescript
// Add import at the top
import { MyNewPickerFieldExtension } from './components/MyNewPicker';

// Add inside <ScaffolderFieldExtensions>
<Route path="/create" element={<ScaffolderPage />}>
  <ScaffolderFieldExtensions>
    <AwsResourcePickerFieldExtension />
    <AzureResourcePickerFieldExtension />
    <GcpResourcePickerFieldExtension />
    <CICDPickerFieldExtension />
    <ObservabilityPickerFieldExtension />
    <SecurityPickerFieldExtension />
    <ContainerPickerFieldExtension />
    <MyNewPickerFieldExtension />    {/* ← add this */}
  </ScaffolderFieldExtensions>
</Route>
```

### Step 4 — Check TypeScript before restarting

```bash
yarn tsc --noEmit 2>&1 | grep -A3 "MyNewPicker"
# Should return nothing — if it does, fix those errors first
```

### Step 5 — Restart Backstage

```bash
yarn dev
```

The new field extension will be available in templates as `ui:field: MyNewPicker`.

---

## Connecting a New Template Catalog

To add a new catalog location (e.g. a second template repo):

Open `app-config.yaml` and add to `catalog.locations`:

```yaml
catalog:
  locations:
    - type: url
      target: https://github.com/equaan/opt-it-catalog/blob/main/catalog-info.yaml
      rules:
        - allow: [Template]

    # Add new catalog here:
    - type: url
      target: https://github.com/equaan/opt-it-catalog-v2/blob/main/catalog-info.yaml
      rules:
        - allow: [Template]
```

Restart Backstage for the change to take effect.

---

## app-config.yaml Reference

Key sections relevant to the scaffolder and catalog:

```yaml
app:
  title: Opt IT Developer Platform
  baseUrl: http://localhost:3000

backend:
  baseUrl: http://localhost:7007

integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}           # set in app-config.local.yaml

catalog:
  locations:
    - type: url
      target: https://github.com/equaan/opt-it-catalog/blob/main/catalog-info.yaml
      rules:
        - allow: [Template]

scaffolder:
  # Default branch for PRs
  defaultBranch: main
```

---

## Debugging Field Extensions

If page 2 of a template renders completely blank (title shows but no content):

**Step 1 — Check TypeScript errors:**
```bash
yarn tsc --noEmit 2>&1 | grep -A3 "PickerName"
```

**Step 2 — Common causes and fixes:**

| Error | Cause | Fix |
|---|---|---|
| `TS6133: React declared but never read` | React imported but not used. Causes **silent** compile failure — component renders nothing | Remove React import: `import { useState } from 'react'` OR add `// eslint-disable-next-line @typescript-eslint/no-unused-vars` before the import line |
| `TS2306: File is not a module` | The component `.tsx` file failed to compile so `index.ts` cannot import it | Fix the underlying TS error in the component file first — the module error will disappear |
| Page 2 blank with no TS errors | Stale webpack cache | Run `yarn clean` then `yarn dev` |

**Step 3 — Verify fix:**
```bash
yarn tsc --noEmit 2>&1 | grep -A3 "PickerName"
# Should return nothing
```

**Step 4 — If still blank after fixing TS errors:**
```bash
yarn clean
yarn dev
```

**The error chain that caused this issue in this project:**
```
TS6133 (unused React import)
  → component .tsx fails to compile
  → index.ts cannot import it → TS2306 (not a module)
  → App.tsx import fails silently
  → component renders blank with no runtime error thrown
```

---

## Debugging

### Template not showing in Backstage

1. Check `catalog-info.yaml` in `opt-it-catalog` — is the template listed?
2. Check `app-config.yaml` — is the catalog URL correct?
3. Restart Backstage — the catalog refreshes every 30 minutes but restart is instant
4. Check the Backstage backend logs for catalog ingestion errors
5. Go to the catalog entity → three dots → **Refresh** to force an immediate re-fetch

### Steps failing in template run

Go to Backstage → Create → find your run → click **View logs**.

| Symptom | Check |
|---|---|
| Step skipped unexpectedly | Check the `if:` condition — log `parameters` to verify values |
| `NotFoundError 404` on fetch | Git tag doesn't exist — run `git tag -l` in opt-it-modules |
| `filter not found: now` | Remove `${{ "" | now }}` from skeleton files |
| `[object Object]` in branch name | Use `.resources` not the whole object |
| `Git Repository is empty` | Client repo needs at least one commit |
| Files missing from PR | Change `fetch:plain` to `fetch:template` with `values: {}` |
| Branch name invalid ref | Branch contains spaces/commas — use static suffix like `setup` |

### Rebuilding after code changes

```bash
# Kill the running dev server (Ctrl+C)
yarn dev
```

Backstage hot-reloads most frontend changes automatically. Backend changes require a restart.

---

## Common Mistakes To Avoid

**Putting secrets in `app-config.yaml`**
Never commit GitHub tokens or any credentials. Use `app-config.local.yaml` for local development and environment variables in production.

**Importing `Root` from the wrong path**
`Root` must be imported from `./components/Root` not from any picker component. This causes a silent build failure.

```typescript
// ✅ Correct
import { Root } from './components/Root';
import { AwsResourcePickerFieldExtension } from './components/AwsResourcePicker';

// ❌ Wrong
import { Root } from './components/AwsResourcePicker';
```

**Registering a field extension outside `<ScaffolderFieldExtensions>`**
The extension must be a direct child of `<ScaffolderFieldExtensions>` inside the `/create` route.

**Not restarting after `app-config.yaml` changes**
Config changes are not hot-reloaded — always restart after changing `app-config.yaml`.

**Running bash scripts from the wrong directory**
Always run `pwd` before running any setup script. The working directory must match the repo the script is targeting.

**Using `fetch:plain` in template steps**
`fetch:plain` runs successfully but files do not appear in the client PR. Always use `fetch:template` with `values: {}` even when you don't need template substitution.

---

## Phase Roadmap

| Phase | Status | New Extensions |
|---|---|---|
| Phase 1 | ✅ Complete | `AwsResourcePicker` |
| Phase 2 | ✅ Complete | `AzureResourcePicker` |
| Phase 2b | ✅ Complete | `GcpResourcePicker` |
| Phase 3 | ✅ Complete | `CICDPicker`, `ObservabilityPicker` |
| Phase 4 | ✅ Complete | `SecurityPicker`, `ContainerPicker` |
| Phase 5 | ✅ Complete | Full Onboarding Wizard — reuses all existing pickers, no new extension needed |

---

## Platform Summary

**3 repositories:**
- `equaan/opt-it-modules` — 18 versioned Terraform modules across AWS, Azure, GCP + CI/CD, Observability, Security, Container modules
- `equaan/opt-it-catalog` — 8 Backstage templates
- `equaan/backstage-2nd` — Backstage app with 7 custom field extensions

**8 templates:**
- ⭐ Full Client Onboarding (Phase 5)
- AWS Infrastructure (Phase 1)
- Azure Infrastructure (Phase 2)
- GCP Infrastructure (Phase 2b)
- CI/CD Pipeline (Phase 3)
- Observability Stack (Phase 3)
- Security Scan (Phase 4)
- Container Setup (Phase 4)

**7 field extensions:**
- AwsResourcePicker
- AzureResourcePicker
- GcpResourcePicker
- CICDPicker
- ObservabilityPicker
- SecurityPicker
- ContainerPicker