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
- [Debugging](#debugging)
- [Common Mistakes To Avoid](#common-mistakes-to-avoid)

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- yarn
- Git
- A GitHub personal access token with `repo` scope (for PR creation)

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
│   │           │   ├── AwsResourcePicker.tsx   ← the React component
│   │           │   └── index.ts                ← registration + validation
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
                 fetch:plain / fetch:template steps
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        opt-it-modules                       │
│                                                             │
│  All versioned IaC modules (Terraform, CFN, Ansible).       │
│  Modules are pinned via git tags.                           │
│  Templates fetch specific tagged versions of modules        │
│  and copy them into the client's repository.                │
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
| Terraform modules | `opt-it-modules/terraform/aws/` |
| CloudFormation templates | `opt-it-modules/cloudformation/aws/` |
| CI/CD templates | `opt-it-modules/cicd/` |

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

## Adding a New Custom Field Extension

If you need a completely new custom field extension (e.g. `AzureResourcePicker`):

### Step 1 — Create the component

```bash
mkdir -p packages/app/src/components/AzureResourcePicker
```

Create `AzureResourcePicker.tsx` following the same pattern as `AwsResourcePicker.tsx`:
- Define the value interface
- Define `SERVICE_DEFINITIONS`
- Write config components per service
- Write the main component using `FieldExtensionComponentProps`

### Step 2 — Create `index.ts`

```typescript
import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderFieldExtension } from '@backstage/plugin-scaffolder-react';
import { AzureResourcePicker } from './AzureResourcePicker';

export const azureResourcePickerValidation = async (
  value: { resources: string; config: object },
  validation: { addError: (msg: string) => void },
) => {
  if (!value?.resources || value.resources.trim() === '') {
    validation.addError('Please select at least one Azure resource.');
  }
};

export const AzureResourcePickerFieldExtension = scaffolderPlugin.provide(
  createScaffolderFieldExtension({
    name: 'AzureResourcePicker',
    component: AzureResourcePicker,
    validation: azureResourcePickerValidation,
  }),
);

export { AzureResourcePicker };
```

### Step 3 — Register in `App.tsx`

Open `packages/app/src/App.tsx` and add:

```typescript
// Add import at the top
import { AzureResourcePickerFieldExtension } from './components/AzureResourcePicker';

// Add inside <ScaffolderFieldExtensions>
<Route path="/create" element={<ScaffolderPage />}>
  <ScaffolderFieldExtensions>
    <AwsResourcePickerFieldExtension />
    <AzureResourcePickerFieldExtension />    {/* ← add this */}
  </ScaffolderFieldExtensions>
</Route>
```

### Step 4 — Restart Backstage

```bash
yarn dev
```

The new field extension will be available in templates as `ui:field: AzureResourcePicker`.

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

## Debugging

### Template not showing in Backstage

1. Check `catalog-info.yaml` in `opt-it-catalog` — is the template listed?
2. Check `app-config.yaml` — is the catalog URL correct?
3. Restart Backstage — the catalog refreshes every 30 minutes but restart is instant
4. Check the Backstage backend logs for catalog ingestion errors

### Custom field extension not working

1. Check `App.tsx` — is the extension registered inside `<ScaffolderFieldExtensions>`?
2. Check `index.ts` — is the extension exported correctly?
3. Check the browser console — TypeScript errors won't always surface in terminal
4. Make sure `ui:field: AwsResourcePicker` matches the name in `createScaffolderFieldExtension`

### Steps failing in template run

Go to Backstage → Create → find your run → click **View logs**.

| Symptom | Check |
|---|---|
| Step skipped unexpectedly | Check the `if:` condition — log `parameters` to verify values |
| `NotFoundError 404` on fetch | Git tag doesn't exist — run `git tag -l` in opt-it-modules |
| `filter not found: now` | Remove `${{ "" | now }}` from skeleton files |
| `[object Object]` in branch name | Use `.resources` not the whole object |
| `Git Repository is empty` | Client repo needs at least one commit |

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
`Root` must be imported from `./components/Root` not from `./components/AwsResourcePicker`. This causes a silent build failure.

```typescript
// ✅ Correct
import { Root } from './components/Root';
import { AwsResourcePickerFieldExtension } from './components/AwsResourcePicker';

// ❌ Wrong — Root is not exported from AwsResourcePicker
import { Root } from './components/AwsResourcePicker';
```

**Registering a field extension outside `<ScaffolderFieldExtensions>`**
The extension must be a direct child of `<ScaffolderFieldExtensions>` inside the `/create` route.

**Not restarting after `app-config.yaml` changes**
Config changes are not hot-reloaded — always restart after changing `app-config.yaml`.

**Running bash scripts from the wrong directory**
Always run `pwd` before running any setup script. The working directory must match the repo the script is targeting.

---

## Phase Roadmap

| Phase | Status | New Extensions |
|---|---|---|
| Phase 1 | ✅ Complete | `AwsResourcePicker` |
| Phase 2 | ✅ Complete | `AzureResourcePicker` |
| Phase 2b | 🔜 Planned | `GcpResourcePicker` |
| Phase 3 | 🔜 Planned | `ObservabilityPicker`, `CICDPicker` |
| Phase 4 | 🔜 Planned | `SecurityPicker`, `ContainerPicker` |
| Phase 5 | 🔜 Planned | Full onboarding wizard |
