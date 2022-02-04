export const getEnvOrThrow = (envVarName: string) => {
  if (envVarName in process.env) {
    return process.env[envVarName] as string;
  }
  throw Error(`${envVarName} environment variable does not exist`);
};

export const getEnvOrDefault = (envVarName: string, defaultValue: string | undefined) => {
  if (envVarName in process.env) {
    return process.env[envVarName] as string;
  }
  return defaultValue;
};
