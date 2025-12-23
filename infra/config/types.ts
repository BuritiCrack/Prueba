export interface AppConfig {
  appName: string;
  env: string;
  location: string;

  imageTag: string;
  acrRequestedName: string;

  dockerContextPath: string;
  dockerfilePath: string;

  targetPort: number;
}
