#!/usr/bin/env node
/**
 * Changelog Generator Script
 *
 * Automatically generates changelog data from git history.
 * Run on each commit via post-commit hook or manually.
 *
 * Usage: node scripts/generate-changelog.js [--days=7]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line args
const args = process.argv.slice(2);
const daysArg = args.find(a => a.startsWith('--days='));
const DAYS_TO_FETCH = daysArg ? parseInt(daysArg.split('=')[1]) : 7;

// Output file
const OUTPUT_FILE = path.join(__dirname, '../src/data/changelog-data.ts');

/**
 * Execute git command and return output
 */
function git(command) {
  try {
    return execSync(`git ${command}`, { encoding: 'utf-8', cwd: path.join(__dirname, '..') }).trim();
  } catch (e) {
    console.error(`Git command failed: git ${command}`);
    return '';
  }
}

/**
 * Get commits from the last N days
 */
function getCommits(days) {
  const format = '%H|%h|%s|%an|%ar|%ad|%ai';
  const since = `--since="${days} days ago"`;
  const log = git(`log ${since} --pretty=format:"${format}" --date=short`);

  if (!log) return [];

  return log.split('\n').filter(Boolean).map(line => {
    const [hash, shortHash, message, author, relativeTime, date, isoDate] = line.split('|');

    // Get stats for this commit
    const stats = git(`show ${hash} --stat --format=""`);
    const statsMatch = stats.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/);

    const filesChanged = statsMatch ? parseInt(statsMatch[1]) || 0 : 0;
    const additions = statsMatch ? parseInt(statsMatch[2]) || 0 : 0;
    const deletions = statsMatch ? parseInt(statsMatch[3]) || 0 : 0;

    // Determine commit type from message
    let type = 'other';
    if (message.startsWith('feat')) type = 'feat';
    else if (message.startsWith('fix')) type = 'fix';
    else if (message.startsWith('refactor')) type = 'refactor';
    else if (message.startsWith('docs')) type = 'docs';
    else if (message.startsWith('style')) type = 'style';
    else if (message.startsWith('test')) type = 'test';
    else if (message.startsWith('chore')) type = 'chore';

    // Categorize based on message content
    let category = 'other';
    const msgLower = message.toLowerCase();
    if (msgLower.includes('ios') || msgLower.includes('hig') || msgLower.includes('ux') || msgLower.includes('ui') || msgLower.includes('layout') || msgLower.includes('design')) {
      category = 'ux';
    } else if (msgLower.includes('auth') || msgLower.includes('admin') || msgLower.includes('permission') || msgLower.includes('security')) {
      category = 'auth';
    } else if (msgLower.includes('analytics') || msgLower.includes('tracking') || msgLower.includes('metric')) {
      category = 'analytics';
    } else if (msgLower.includes('performance') || msgLower.includes('cache') || msgLower.includes('optimize') || msgLower.includes('speed')) {
      category = 'performance';
    } else if (msgLower.includes('cleanup') || msgLower.includes('remove') || msgLower.includes('delete') || msgLower.includes('deprecat')) {
      category = 'cleanup';
    } else if (msgLower.includes('bug') || msgLower.includes('fix')) {
      category = 'bugfix';
    }

    return {
      hash,
      shortHash,
      message: message.replace(/^(feat|fix|refactor|docs|style|test|chore)(\(.+?\))?:\s*/i, ''),
      fullMessage: message,
      author,
      relativeTime,
      date,
      isoDate,
      type,
      category,
      additions,
      deletions,
      filesChanged,
    };
  });
}

/**
 * Get overall stats
 */
function getStats(commits) {
  return {
    totalCommits: commits.length,
    totalAdditions: commits.reduce((sum, c) => sum + c.additions, 0),
    totalDeletions: commits.reduce((sum, c) => sum + c.deletions, 0),
    totalFilesChanged: commits.reduce((sum, c) => sum + c.filesChanged, 0),
    netLines: commits.reduce((sum, c) => sum + c.additions - c.deletions, 0),
  };
}

/**
 * Get category distribution
 */
function getCategoryStats(commits) {
  const categories = {};
  commits.forEach(c => {
    categories[c.category] = (categories[c.category] || 0) + 1;
  });
  return categories;
}

/**
 * Get type distribution
 */
function getTypeStats(commits) {
  const types = {};
  commits.forEach(c => {
    types[c.type] = (types[c.type] || 0) + 1;
  });
  return types;
}

/**
 * Get files most changed
 */
function getMostChangedFiles(days) {
  const since = `--since="${days} days ago"`;
  const log = git(`log ${since} --numstat --pretty=format:""`);

  if (!log) return [];

  const fileCounts = {};
  log.split('\n').filter(Boolean).forEach(line => {
    const parts = line.split('\t');
    if (parts.length >= 3) {
      const file = parts[2];
      if (file && !file.includes('=>')) {
        fileCounts[file] = (fileCounts[file] || 0) + 1;
      }
    }
  });

  return Object.entries(fileCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));
}

/**
 * Get contributors
 */
function getContributors(commits) {
  const contributors = {};
  commits.forEach(c => {
    contributors[c.author] = (contributors[c.author] || 0) + 1;
  });
  return Object.entries(contributors)
    .sort(([, a], [, b]) => b - a)
    .map(([name, commits]) => ({ name, commits }));
}

/**
 * Get current branch info
 */
function getBranchInfo() {
  const currentBranch = git('rev-parse --abbrev-ref HEAD');
  const lastCommitHash = git('rev-parse --short HEAD');
  const lastCommitDate = git('log -1 --format=%ci');

  return {
    currentBranch,
    lastCommitHash,
    lastCommitDate,
  };
}

/**
 * Generate date range string
 */
function getDateRange(commits) {
  if (!commits.length) return { start: '', end: '' };

  const dates = commits.map(c => new Date(c.isoDate));
  const oldest = new Date(Math.min(...dates));
  const newest = new Date(Math.max(...dates));

  const formatDate = (d) => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`;
  };

  return {
    start: formatDate(oldest),
    end: formatDate(newest),
  };
}

/**
 * Main execution
 */
function main() {
  console.log(`Generating changelog data for last ${DAYS_TO_FETCH} days...`);

  const commits = getCommits(DAYS_TO_FETCH);
  const stats = getStats(commits);
  const categoryStats = getCategoryStats(commits);
  const typeStats = getTypeStats(commits);
  const mostChangedFiles = getMostChangedFiles(DAYS_TO_FETCH);
  const contributors = getContributors(commits);
  const branchInfo = getBranchInfo();
  const dateRange = getDateRange(commits);

  const data = {
    generatedAt: new Date().toISOString(),
    daysIncluded: DAYS_TO_FETCH,
    dateRange,
    branchInfo,
    stats,
    categoryStats,
    typeStats,
    mostChangedFiles,
    contributors,
    commits: commits.map(c => ({
      hash: c.shortHash,
      message: c.message,
      fullMessage: c.fullMessage,
      author: c.author,
      relativeTime: c.relativeTime,
      date: c.date,
      type: c.type,
      category: c.category,
      additions: c.additions,
      deletions: c.deletions,
      filesChanged: c.filesChanged,
    })),
  };

  // Generate TypeScript file
  const tsContent = `/**
 * Auto-generated changelog data
 * Generated at: ${data.generatedAt}
 *
 * DO NOT EDIT MANUALLY - Run 'npm run changelog' to regenerate
 */

export interface ChangelogCommit {
  hash: string;
  message: string;
  fullMessage: string;
  author: string;
  relativeTime: string;
  date: string;
  type: 'feat' | 'fix' | 'refactor' | 'docs' | 'style' | 'test' | 'chore' | 'other';
  category: 'ux' | 'auth' | 'analytics' | 'performance' | 'cleanup' | 'bugfix' | 'other';
  additions: number;
  deletions: number;
  filesChanged: number;
}

export interface ChangelogStats {
  totalCommits: number;
  totalAdditions: number;
  totalDeletions: number;
  totalFilesChanged: number;
  netLines: number;
}

export interface ChangelogData {
  generatedAt: string;
  daysIncluded: number;
  dateRange: {
    start: string;
    end: string;
  };
  branchInfo: {
    currentBranch: string;
    lastCommitHash: string;
    lastCommitDate: string;
  };
  stats: ChangelogStats;
  categoryStats: Record<string, number>;
  typeStats: Record<string, number>;
  mostChangedFiles: Array<{ file: string; count: number }>;
  contributors: Array<{ name: string; commits: number }>;
  commits: ChangelogCommit[];
}

export const changelogData: ChangelogData = ${JSON.stringify(data, null, 2)};

export default changelogData;
`;

  // Ensure data directory exists
  const dataDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Write file
  fs.writeFileSync(OUTPUT_FILE, tsContent);

  console.log(`✅ Changelog data generated successfully!`);
  console.log(`   - ${commits.length} commits processed`);
  console.log(`   - ${stats.totalAdditions} additions, ${stats.totalDeletions} deletions`);
  console.log(`   - Output: ${OUTPUT_FILE}`);
}

main();
