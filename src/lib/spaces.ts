import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface SpaceInfo {
  Description: string;
}

export interface SpaceConfig {
  [category: string]: SpaceInfo;
}

export interface SpacesConfig {
  spaces: SpaceConfig;
}

/**
 * Read spaces configuration from yaml file
 */
export const getSpacesConfig = (): SpacesConfig => {
  try {
    const configPath = path.join(process.cwd(), 'spaces.yaml');
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(fileContents) as SpacesConfig;
    return config;
  } catch (error) {
    console.error('Error reading spaces config:', error);
    return {
      spaces: {}
    };
  }
};

/**
 * Generate a unique 5-character alphanumeric ID
 */
export const generateUniqueId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}; 