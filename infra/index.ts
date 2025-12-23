import { getAppConfig } from "./config";
import { baseName, toValidAcrName } from "./config/naming";

import { createResourceGroup } from "./components/resource-group";
import { createAcr } from "./components/acr";
import { createLogAnalytics } from "./components/log-analytics";
import { createManagedEnvironment } from "./components/aca-env";
import { buildAndPushImage } from "./components/docker-image";
import { createContainerApp } from "./components/container-app";

const cfg = getAppConfig();

const rgName = baseName(cfg.appName, cfg.env, cfg.location, "rg");
const acrLogicalName = baseName(cfg.appName, cfg.env, cfg.location, "acr");
const lawName = baseName(cfg.appName, cfg.env, cfg.location, "law");
const acaEnvName = baseName(cfg.appName, cfg.env, cfg.location, "aca-env");
const dockerImageName = baseName(cfg.appName, cfg.env, cfg.location, "docker-image");
const acaAppName = baseName(cfg.appName, cfg.env, cfg.location, "aca-app");

const acrSanitizedName = toValidAcrName(cfg.acrRequestedName, cfg.env, cfg.location);

// 1) RG
const resourceGroup = createResourceGroup(rgName, cfg.location);

// 2) ACR + creds
const acr = createAcr({
  name: acrLogicalName,
  registryName: acrSanitizedName,
  resourceGroupName: resourceGroup.name,
  location: resourceGroup.location,
});

// 3) Log Analytics
const law = createLogAnalytics({
  name: lawName,
  resourceGroupName: resourceGroup.name,
  location: resourceGroup.location,
});

// 4) ACA Environment
const acaEnv = createManagedEnvironment({
  name: acaEnvName,
  resourceGroupName: resourceGroup.name,
  location: resourceGroup.location,
  logAnalyticsCustomerId: law.workspace.customerId,
  logAnalyticsSharedKey: law.sharedKeys.apply((k) => k.primarySharedKey!),
});

// 5) Build + Push image
const img = buildAndPushImage({
  name: dockerImageName,
  loginServer: acr.loginServer,
  appName: cfg.appName,
  imageTag: cfg.imageTag,
  dockerContextPath: cfg.dockerContextPath,
  dockerfilePath: cfg.dockerfilePath,
  acrUsername: acr.username,
  acrPassword: acr.password,
});

// 6) Container App
const aca = createContainerApp({
  name: acaAppName,
  resourceGroupName: resourceGroup.name,
  location: resourceGroup.location,
  managedEnvironmentId: acaEnv.managedEnv.id,
  loginServer: acr.loginServer,
  acrUsername: acr.username,
  acrPassword: acr.password,
  imageName: img.pushedImage.imageName,
  targetPort: cfg.targetPort,
});

// Outputs
export const resourceGroupId = resourceGroup.id;
export const acrName = acr.registry.name;
export const acrLoginServer = acr.loginServer;
export const imagePushed = img.pushedImage.imageName;
export const containerAppName = aca.containerApp.name;
export const containerAppFqdn = aca.fqdn;
