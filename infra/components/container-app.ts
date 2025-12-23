import * as pulumi from "@pulumi/pulumi";
import * as app from "@pulumi/azure-native/app";

export function createContainerApp(args: {
  name: string;
  resourceGroupName: pulumi.Input<string>;
  location: pulumi.Input<string>;
  managedEnvironmentId: pulumi.Input<string>;

  loginServer: pulumi.Input<string>;
  acrUsername: pulumi.Input<string>;
  acrPassword: pulumi.Input<string>;

  imageName: pulumi.Input<string>;
  targetPort: number;
}) {
  const registryPasswordSecretName = "acr-password";

  const containerApp = new app.ContainerApp(args.name, {
    resourceGroupName: args.resourceGroupName,
    location: args.location,
    containerAppName: args.name,
    managedEnvironmentId: args.managedEnvironmentId,

    configuration: {
      ingress: {
        external: true,
        targetPort: args.targetPort,
        transport: "auto",
      },
      secrets: [
        { name: registryPasswordSecretName, value: args.acrPassword },
      ],
      registries: [
        {
          server: args.loginServer,
          username: args.acrUsername,
          passwordSecretRef: registryPasswordSecretName,
        },
      ],
    },

    template: {
      containers: [
        {
          name: "web",
          image: args.imageName,
          env: [{ name: "PORT", value: args.targetPort.toString() }],
        },
      ],
      scale: { minReplicas: 1, maxReplicas: 1 },
    },
  });

  const fqdn = containerApp.configuration.apply((c) => c?.ingress?.fqdn ?? "No FQDN available yet");

  return { containerApp, fqdn };
}
