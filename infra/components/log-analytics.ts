import * as pulumi from "@pulumi/pulumi";
import * as operationalinsights from "@pulumi/azure-native/operationalinsights";

export function createLogAnalytics(args: {
  name: string;
  resourceGroupName: pulumi.Input<string>;
  location: pulumi.Input<string>;
  retentionInDays?: number;
}) {
  const workspace = new operationalinsights.Workspace(args.name, {
    resourceGroupName: args.resourceGroupName,
    location: args.location,
    workspaceName: args.name,
    sku: { name: "PerGB2018" },
    retentionInDays: args.retentionInDays ?? 30,
  });

  const sharedKeys = pulumi.all([args.resourceGroupName, workspace.name]).apply(([rgName, wsName]) =>
    operationalinsights.getSharedKeys({
      resourceGroupName: rgName,
      workspaceName: wsName,
    })
  );

  return { workspace, sharedKeys };
}
