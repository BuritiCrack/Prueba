import * as resources from "@pulumi/azure-native/resources";
import * as pulumi from "@pulumi/pulumi";

export function createResourceGroup(name: string, location: pulumi.Input<string>) {
  return new resources.ResourceGroup(name, {
    resourceGroupName: name,
    location,
  });
}
