#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

async function getPackageList(maintainer = 'nhavantuonglai') {
	try {
		const response = await axios.get(`https://registry.npmjs.org/-/v1/search?text=maintainer:${maintainer}`);
		return response.data.objects.map(pkg => pkg.package.name);
	} catch (error) {
		console.error('Lỗi khi lấy danh sách gói:', error.message);
		return [];
	}
}

async function getDownloads(packageName) {
	try {
		const response = await axios.get(`https://api.npmjs.org/downloads/range/last-12-months/${packageName}`);
		const downloads = response.data.downloads.reduce((sum, day) => sum + day.downloads, 0) || 0;
		return { name: packageName, downloads };
	} catch (error) {
		console.error(`Lỗi khi lấy lượt tải cho ${packageName}:`, error.message);
		return { name: packageName, downloads: 0 };
	}
}

async function generateStatsTable() {
	const packages = await getPackageList();
	if (!packages.length) {
		console.log('Không tìm thấy gói nào.');
		return;
	}

	const downloadPromises = packages.map(pkg => getDownloads(pkg));
	const downloadStats = await Promise.all(downloadPromises);

	const totalDownloads = downloadStats.reduce((sum, pkg) => sum + pkg.downloads, 0);
	const topPackages = downloadStats.sort((a, b) => b.downloads - a.downloads).slice(0, 3);

	let table = `### Thống kê lượt tải npm trong 12 tháng qua\n\n`;
	table += `Tổng lượt tải: ${totalDownloads}\n\n`;
	table += `#### Danh sách 3 package có lượt tải cao nhất\n\n`;
	table += `| Thứ hạng | Tên gói						 | Lượt tải |\n`;
	table += `|----------|---------------------|----------|\n`;
	topPackages.forEach((pkg, index) => {
		table += `| ${index + 1}			 | ${pkg.name.padEnd(19)} | ${pkg.downloads.toString().padEnd(8)} |\n`;
	});

	fs.writeFileSync('stats.md', table);
	console.log('Đã tạo file stats.md');
}

generateStatsTable();