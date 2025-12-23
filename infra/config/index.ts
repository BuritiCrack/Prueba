import * as pulumi from "@pulumi/pulumi";
import { AppConfig } from "./types";

export function getAppConfig(): AppConfig {
  const config = new pulumi.Config();

  return {
    appName: config.get("appName") ?? "hello-aca",
    env: config.get("env") ?? pulumi.getStack(),
    location: config.get("location") ?? "eastus",

    imageTag: config.get("imageTag") ?? "v1",
    acrRequestedName: config.get("acrRequestedName") ?? "Imagen-Prueba",

    dockerContextPath: config.get("dockerContextPath") ?? "../",
    dockerfilePath: config.get("dockerfilePath") ?? "../Dockerfile",

    targetPort: Number(config.get("targetPort") ?? "3000"),
  };
}
