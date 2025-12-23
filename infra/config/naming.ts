export function baseName(appName: string, env: string, location: string, suffix: string) {
  return `${suffix}-${appName}-${env}-${location}`;
}

// ACR: solo minúsculas y números, 5-50 chars
export function toValidAcrName(input: string, env: string, location: string) {
  const cleaned = input.toLowerCase().replace(/[^a-z0-9]/g, "");
  const withSuffix = `${cleaned}${env}${location}`.toLowerCase();
  const padded = withSuffix.length < 5 ? (withSuffix + "00000").slice(0, 5) : withSuffix;
  return padded.slice(0, 50);
}
