#!/usr/bin/env node

const axios = require('axios');

async function getPackageList() {
  try {
    const response = await axios.get('https://registry.npmjs.org/-/v1/search?text=scope:outdate');
    const packages = response.data.objects.map(pkg => pkg.package.name);
    console.log(`Đã tìm thấy ${packages.length} gói dưới scope @outdate`);
    return packages;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách gói:', error.message);
    return [];
  }
}

async function getDownloads(packageName, period = 'last-month') {
  try {
    const response = await axios.get(`https://api.npmjs.org/downloads/point/${period}/${packageName}`);
    console.log(`Lấy thành công lượt tải cho ${packageName}: ${response.data.downloads}`);
    return { name: packageName, downloads: response.data.downloads || 0 };
  } catch (error) {
    console.error(`Lỗi khi lấy lượt tải cho ${packageName}: ${error.response ? error.response.status : error.message}`);
    return { name: packageName, downloads: 0 };
  }
}

async function displayDownloadStats() {
  console.log('Đang lấy thống kê lượt tải cho các gói @outdate...');
  
  const packages = await getPackageList();
  if (!packages.length) {
    console.log('Không tìm thấy gói nào dưới scope @outdate.');
    return;
  }

  const downloadPromises = packages.map(pkg => getDownloads(pkg));
  const downloadStats = await Promise.all(downloadPromises);
  const totalDownloads = downloadStats.reduce((sum, pkg) => sum + pkg.downloads, 0);
  console.log(`Tổng lượt tải: ${totalDownloads}`);
  const topPackages = downloadStats.sort((a, b) => b.downloads - a.downloads).slice(0, 3);
  console.log('\nTop 3 gói có lượt tải cao nhất:');
  topPackages.forEach(pkg => console.log(`${pkg.name} > Tổng lượt tải: ${pkg.downloads}`));
}

displayDownloadStats();