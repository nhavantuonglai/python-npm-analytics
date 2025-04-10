#!/usr/bin/env node

const axios = require('axios');

async function getDownloads(packageName, period = 'last-month') {
  try {
    const response = await axios.get(`https://api.npmjs.org/downloads/point/${period}/${packageName}`);
    return { name: packageName, downloads: response.data.downloads || 0 };
  } catch (error) {
    console.error(`Lỗi khi lấy lượt tải cho ${packageName}:`, error.message);
    return { name: packageName, downloads: 0 };
  }
}

async function displayDownloadStats() {
  console.log('Đang lấy thống kê lượt tải cho các gói @nhavantuonglai...');
  
  // Danh sách gói thủ công (cập nhật theo gói thực tế của bạn)
  const packages = [
    '@nhavantuonglai/markdown-attribute',
    '@nhavantuonglai/sitemap-extractor',
    '@nhavantuonglai/folder-attribute',
    '@nhavantuonglai/javascript-starfield',
    '@nhavantuonglai/javascript-supernova',
    '@nhavantuonglai/table-of-content',
    '@nhavantuonglai/gemini-chat',
    '@nhavantuonglai/folder-execute',
    '@nhavantuonglai/npmjs-analytics'
    // Thêm các gói khác bạn đã xuất bản vào đây
  ];

  if (!packages.length) {
    console.log('Không có gói nào được chỉ định.');
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