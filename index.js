#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const chalk = require('chalk');

async function getPackageList(maintainer = 'nhavantuonglai') {
  try {
    const response = await axios.get(`https://registry.npmjs.org/-/v1/search?text=maintainer:${maintainer}`);
    const packages = response.data.objects.map(pkg => pkg.package.name);
    console.log(chalk.green(`Đã tìm thấy ${packages.length} gói do ${maintainer} xuất bản`));
    return packages;
  } catch (error) {
    console.error(chalk.red('Lỗi khi lấy danh sách gói:', error.message));
    return [];
  }
}

async function getDownloads(packageName) {
  try {
    const response = await axios.get(`https://api.npmjs.org/downloads/range/last-12-months/${packageName}`);
    const downloads = response.data.downloads.reduce((sum, day) => sum + day.downloads, 0) || 0;
    console.log(chalk.blue(`- ${packageName}: ${downloads} lượt tải`));
    return { name: packageName, downloads };
  } catch (error) {
    console.error(chalk.red(`Lỗi khi lấy lượt tải cho ${packageName}: ${error.response?.status || error.message}`));
    return { name: packageName, downloads: 0 };
  }
}

async function generateStats() {
  console.log(chalk.cyan('Đang lấy thống kê lượt tải trong 12 tháng qua...'));

  const packages = await getPackageList();
  if (!packages.length) {
    console.log(chalk.yellow('Không tìm thấy gói nào do nhavantuonglai xuất bản.'));
    return;
  }

  const downloadPromises = packages.map(pkg => getDownloads(pkg));
  const downloadStats = await Promise.all(downloadPromises);

  const totalDownloads = downloadStats.reduce((sum, pkg) => sum + pkg.downloads, 0);
  const topPackages = downloadStats.sort((a, b) => b.downloads - a.downloads).slice(0, 3);

  const stats = {
    totalDownloads,
    topPackages,
    lastUpdated: new Date().toISOString()
  };

  fs.writeFileSync('stats.json', JSON.stringify(stats, null, 2));
  console.log(chalk.green('Đã tạo file stats.json'));
}

generateStats();