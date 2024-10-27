import fs from 'fs/promises';
import { MD_DIR, PROJECT_URL } from '../constants';

export const generateMetadata = (metadata: Record<string, string>) => {
  const payload = `## Metadata
\`\`\`json
${JSON.stringify(metadata, null, 2)}
\`\`\`
`;
  return payload;
};

export const getDirs = async () => {
  /* returns: {0 : '0-initialization', 1: '1-outreach'} */

  const dirs = {} as { [key: number]: string };

  const files = await fs.readdir(MD_DIR, { withFileTypes: true });
  files
    .filter(file => file.isDirectory()) // Filter out only directories
    .forEach(dir => {
      const nameNum = dir.name.split('-')[0]; // take only the number part of the directory name (e.g., 1-outreach -> 1)
      const castedNameNum = Number(nameNum);
      const validFormat = !isNaN(castedNameNum) && nameNum.trim() !== '';
      if (!validFormat) return;
      dirs[castedNameNum] = dir.name;
    });

  return dirs;
};

export const getProjectUrl = (milestoneTitle: string) => {
  return PROJECT_URL + `&sliceBy%5Bvalue%5D=${encodeURIComponent(milestoneTitle)}`;
};
