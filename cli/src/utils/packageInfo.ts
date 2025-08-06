import * as fs from 'fs';
import * as path from 'path';

interface PackageInfo {
  name: string;
  version: string;
  description: string;
  author: string;
}

let cachedPackageInfo: PackageInfo | null = null;

function loadPackageInfo(): PackageInfo {
  if (cachedPackageInfo) {
    return cachedPackageInfo;
  }

  try {
    const packagePath = path.resolve(__dirname, '../../package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

    cachedPackageInfo = {
      name: packageData.name || '@sentient/cli',
      version: packageData.version || '1.0.0',
      description: packageData.description || 'Sentient CLI - AI Agent Toolkit',
      author: packageData.author || 'Sentient Team',
    };
  } catch (error) {
    // Fallback values if package.json can't be read
    cachedPackageInfo = {
      name: '@sentient/cli',
      version: '1.0.0',
      description: 'Sentient CLI - AI Agent Toolkit',
      author: 'Sentient Team',
    };
  }

  return cachedPackageInfo;
}

export const packageInfo = loadPackageInfo();