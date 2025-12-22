import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import * as containerregistry from "@pulumi/azure-native/containerregistry";
import * as operationalinsights from "@pulumi/azure-native/operationalinsights";
import * as app from "@pulumi/azure-native/app";
import * as docker from "@pulumi/docker";

// -------------------------
// Config (ajústalo aquí)
// -------------------------
const config = new pulumi.Config();

// Nombres “humanos” para tu app/entorno (puedes cambiarlos en Pulumi config si quieres)
const appName = config.get("appName") ?? "hello-aca";
const env = config.get("env") ?? "dev";
const location = "eastus";

// Tag de la imagen
const imageTag = config.get("imageTag") ?? "v1";

// Nombre ACR pedido por ti (pero hay que sanitizarlo)
const acrRequestedName = "Imagen-Prueba";

// Path al contexto Docker: si tu Dockerfile está en la raíz del repo y este index.ts está en /infra
const dockerContextPath = config.get("dockerContextPath") ?? "../";
// Path al Dockerfile (relativo al contexto)
const dockerfilePath = config.get("dockerfilePath") ?? "../Dockerfile";

// Puerto donde escucha tu app dentro del contenedor
const targetPort = Number(config.get("targetPort") ?? "3000");

// -------------------------
// Helpers de naming
// -------------------------
function baseName(suffix: string) {
  return `${suffix}-${appName}-${env}-${location}`;
}

// ACR: solo minúsculas y números, 5-50 chars
function toValidAcrName(input: string) {
  const cleaned = input.toLowerCase().replace(/[^a-z0-9]/g, "");
  // Añadimos env+loc para evitar colisión global
  const withSuffix = `${cleaned}${env}${location}`.toLowerCase();
  // Asegurar longitud mínima
  const padded = withSuffix.length < 5 ? (withSuffix + "00000").slice(0, 5) : withSuffix;
  // Asegurar longitud máxima
  return padded.slice(0, 50);
}

const acrName = toValidAcrName(acrRequestedName);

// -------------------------
// Resource Group
// -------------------------
const resourceGroup = new resources.ResourceGroup(baseName("rg"), {
  resourceGroupName: baseName("rg"),
  location,
});

// -------------------------
// ACR (Azure Container Registry)
// -------------------------
const registry = new containerregistry.Registry(baseName("acr"), {
  resourceGroupName: resourceGroup.name,
  location: resourceGroup.location,
  registryName: acrName, // <- Sanitizado automáticamente
  sku: { name: "Basic" },
  adminUserEnabled: true, // para obtener username/password fácilmente
});

// Credenciales del ACR
const acrCreds = pulumi
  .all([resourceGroup.name, registry.name])
  .apply(([rgName, regName]) => 
    containerregistry.listRegistryCredentials({ 
        resourceGroupName: rgName, 
        registryName: regName 
    })
);


const acrUsername = acrCreds.apply((c) => {
  if (!c.username) throw new Error("ACR username not available");
  return c.username;
});

const acrPassword = acrCreds.apply((c) => {
  if (!c.passwords || c.passwords.length === 0) {
    throw new Error("ACR password not available");
  }
  return c.passwords[0].value!;
});
const loginServer = registry.loginServer;

// -------------------------
// Log Analytics (para logs de ACA)
// -------------------------
const workspace = new operationalinsights.Workspace(baseName("law"), {
  resourceGroupName: resourceGroup.name,
  location: resourceGroup.location,
  workspaceName: baseName("law"),
  sku: { name: "PerGB2018" },
  retentionInDays: 30,
});

const sharedKeys = pulumi
  .all([resourceGroup.name, workspace.name])
  .apply(([rgName, wsName]) => 
    operationalinsights.getSharedKeys({ 
        resourceGroupName: rgName, workspaceName: wsName }));

// -------------------------
// Container Apps Environment (Managed Environment)
// -------------------------
const managedEnv = new app.ManagedEnvironment(baseName("aca-env"), {
  resourceGroupName: resourceGroup.name,
  location: resourceGroup.location,
  environmentName: baseName("aca-env"),
  appLogsConfiguration: {
    destination: "log-analytics",
    logAnalyticsConfiguration: {
      customerId: workspace.customerId,
      sharedKey: sharedKeys.apply((k) => k.primarySharedKey!),
    },
  },
});

// -------------------------
// Build + Push image to ACR (desde tu Dockerfile)
// -------------------------
// Nota: Aunque ya tengas la imagen local, esta forma es más reproducible:
// Pulumi construye y empuja en el mismo apply.
const imageName = pulumi.interpolate`${loginServer}/${appName}:${imageTag}`;

const pushedImage = new docker.Image(baseName("docker-image"), {
  imageName,
  build: {
    context: dockerContextPath,
    dockerfile: dockerfilePath,
    platform: "linux/amd64",
  },
  registry: {
    server: loginServer,
    username: acrUsername,
    password: acrPassword,
  },
});

// -------------------------
// Azure Container App
// -------------------------
const registryPasswordSecretName = "acr-password";

const containerApp = new app.ContainerApp(baseName("aca-app"), {
  resourceGroupName: resourceGroup.name,
  location: resourceGroup.location,
  containerAppName: baseName("aca-app"),
  managedEnvironmentId: managedEnv.id,

  configuration: {
    ingress: {
      external: true,
      targetPort: targetPort,
      transport: "auto",
    },

    secrets: [
      {
        name: registryPasswordSecretName,
        value: acrPassword,
      },
    ],

    registries: [
      {
        server: loginServer,
        username: acrUsername,
        passwordSecretRef: registryPasswordSecretName,
      },
    ],
  },

  template: {
    containers: [
      {
        name: "web",
        image: pushedImage.imageName, // usa la imagen empujada al ACR
        env: [
          { name: "PORT", value: targetPort.toString() },
        ],
      },
    ],
    scale: {
      minReplicas: 1,
      maxReplicas: 1,
    },
  },
});

// -------------------------
// Outputs útiles
// -------------------------
export const acrSanitizedName = registry.name;
export const acrLoginServer = loginServer;
export const imagePushed = pushedImage.imageName;
export const containerAppName = containerApp.name;
export const containerAppFqdn = containerApp.configuration.apply(
    c => c?.ingress?.fqdn ?? "No FQDN available yet");
