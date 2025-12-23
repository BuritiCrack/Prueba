import * as pulumi from "@pulumi/pulumi";
import * as app from "@pulumi/azure-native/app";

export function createManagedEnvironment(args: {
  name: string;
  resourceGroupName: pulumi.Input<string>;
  location: pulumi.Input<string>;
  logAnalyticsCustomerId: pulumi.Input<string>;
  logAnalyticsSharedKey: pulumi.Input<string>;
}) {
  const managedEnv = new app.ManagedEnvironment(args.name, {
    resourceGroupName: args.resourceGroupName,
    location: args.location,
    environmentName: args.name,
    appLogsConfiguration: {
      destination: "log-analytics",
      logAnalyticsConfiguration: {
        customerId: args.logAnalyticsCustomerId,
        sharedKey: args.logAnalyticsSharedKey,
      },
    },
  });

  return { managedEnv };
}
