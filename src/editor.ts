import fs from 'fs';
import { create } from './logging';
import { readmePath, coveragePath, hashes, coverageUrl } from './constants';
import { THashes, TReport } from './types';

const Logger = create('Tamperer');

export const getReadmeHashes = (readmeFile: string) => {
  Logger.info('- Getting readme hashes...');

  const readmeHashes = hashes.coverage.map((hash) => {
    if (readmeFile.includes(`![${hash.value}]`)) {
      return hash;
    }

    return false;
  });

  const filteredHashes = readmeHashes.filter(Boolean);

  return (filteredHashes as unknown) as THashes[];
};

export const getCoverageColor = (coverage: number) => {
  if (coverage < 80) {
    return 'red';
  }
  if (coverage < 90) {
    return 'yellow';
  }

  return 'brightgreen';
};

export const getCoverageBadge = (coverageFile: string, hashKey: string) => {
  Logger.info(` - Getting coverage badge url for ${hashKey}...`);

  try {
    const parsedCoverage: TReport = JSON.parse(coverageFile);

    if (!parsedCoverage.total && parsedCoverage.total[hashKey]) {
      return false;
    }

    const coverage: number = parsedCoverage.total[hashKey].pct;
    const color = getCoverageColor(coverage);

    return coverageUrl(coverage, color);
  } catch {
    return false;
  }
};

export const getNewReadme = (readmeFile: string, coverageFile: string) => (
  readmeHashes: THashes[],
): Promise<string> => {
  Logger.info('- Getting new readme data...');

  let newReadmeFile = readmeFile;

  return new Promise((resolve, reject) => {
    readmeHashes.forEach((hash) => {
      const coverageBadge = getCoverageBadge(coverageFile, hash.key);

      if (!coverageBadge) {
        reject('There has been an error getting new coverage badges');
      }

      const pattern = `![${hash.value}]`;

      const startIndex = newReadmeFile.indexOf(pattern);
      const valueToChangeStart = newReadmeFile.slice(startIndex + pattern.length);

      const valueToChangeIndex = valueToChangeStart.indexOf(')');
      const valueToChangeFinal = valueToChangeStart.substring(1, valueToChangeIndex);

      const newUrl = `${coverageBadge}`;

      newReadmeFile = newReadmeFile.replace(valueToChangeFinal, newUrl);
    });

    resolve(newReadmeFile);
  });
};

export const writeNewReadme = (readmePath: string) => (newReadmeData: string) => {
  Logger.info('- Writing new readme data...');

  try {
    fs.writeFileSync(readmePath, newReadmeData, 'utf8');
  } catch {
    return false;
  }
};

export const editReadme = () => {
  Logger.info('2. Editor process started');

  const readmeFile = fs.readFileSync(readmePath, 'utf-8');
  const coverageFile = fs.readFileSync(coveragePath, 'utf8');

  return Promise.resolve(readmeFile)
    .then(getReadmeHashes)
    .then(getNewReadme(readmeFile, coverageFile))
    .then(writeNewReadme(readmePath))
    .then(() => Logger.info('2. Editor process ended'));
};