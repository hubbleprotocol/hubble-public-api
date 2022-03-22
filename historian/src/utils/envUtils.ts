export const getEnvOrThrow = (envVarName: string) => {
  if (envVarName in process.env) {
    return process.env[envVarName] as string;
  }
  throw Error(`${envVarName} environment variable does not exist`);
};

/**
 * Get environment variable if it exists.
 * If it doesn't exist and the environment is development - return default value.
 * Throw error if the environment variable doesn't exist in production.
 * @param envVarName
 * @param defaultValue
 */
export const getEnvOrThrowInProduction = (envVarName: string, defaultValue: string) => {
  if (envVarName in process.env) {
    return process.env[envVarName] as string;
  }
  if (process.env.NODE_ENV === 'production') {
    throw Error(`${envVarName} environment variable does not exist`);
  }
  return defaultValue;
};

export const getEnvOrDefault = (envVarName: string, defaultValue: string | undefined) => {
  if (envVarName in process.env) {
    return process.env[envVarName] as string;
  }
  return defaultValue;
};
