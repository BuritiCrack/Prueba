import * as pulumi from "@pulumi/pulumi";
import * as containerregistry from "@pulumi/azure-native/containerregistry";

export function createAcr(args: {
  name: string; // logical name pulumi
  registryName: string; // sanitized ACR name
  resourceGroupName: pulumi.Input<string>;
  location: pulumi.Input<string>;
}) {
  const registry = new containerregistry.Registry(args.name, {
    resourceGroupName: args.resourceGroupName,
    location: args.location,
    registryName: args.registryName,
    sku: { name: "Basic" },
    adminUserEnabled: true,
  });

  const creds = pulumi.all([args.resourceGroupName, registry.name]).apply(([rgName, regName]) =>
    containerregistry.listRegistryCredentials({
      resourceGroupName: rgName,
      registryName: regName,
    })
  );

  const username = creds.apply((c) => {
    if (!c.username) throw new Error("ACR username not available");
    return c.username;
  });

  const password = creds.apply((c) => {
    if (!c.passwords || c.passwords.length === 0) throw new Error("ACR password not available");
    return c.passwords[0].value!;
  });

  return {
    registry,
    loginServer: registry.loginServer,
    username,
    password,
  };
}
