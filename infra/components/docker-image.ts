import * as pulumi from "@pulumi/pulumi";
import * as docker from "@pulumi/docker";

export function buildAndPushImage(args: {
  name: string;
  loginServer: pulumi.Input<string>;
  appName: string;
  imageTag: string;

  dockerContextPath: string;
  dockerfilePath: string;

  acrUsername: pulumi.Input<string>;
  acrPassword: pulumi.Input<string>;
}) {
  const imageName = pulumi.interpolate`${args.loginServer}/${args.appName}:${args.imageTag}`;

  const pushedImage = new docker.Image(args.name, {
    imageName,
    build: {
      context: args.dockerContextPath,
      dockerfile: args.dockerfilePath,
      platform: "linux/amd64",
    },
    registry: {
      server: args.loginServer,
      username: args.acrUsername,
      password: args.acrPassword,
    },
  });

  return { pushedImage, imageName };
}
