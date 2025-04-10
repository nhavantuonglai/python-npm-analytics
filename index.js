#!/usr/bin/env node

const axios = require('axios');
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

async function displayDownloadStats() {
	console.log(chalk.cyan('Đang lấy thống kê lượt tải trong 12 tháng qua...'));

	const packages = await getPackageList();
	if (!packages.length) {
		console.log(chalk.yellow('Không tìm thấy gói nào do nhavantuonglai xuất bản.'));
		return;
	}

	const downloadPromises = packages.map(pkg => getDownloads(pkg));
	const downloadStats = await Promise.all(downloadPromises);

	const totalDownloads = downloadStats.reduce((sum, pkg) => sum + pkg.downloads, 0);
	console.log(chalk.green.bold(`\nTổng lượt tải trong 12 tháng qua: ${totalDownloads}`));

	const topPackages = downloadStats
		.sort((a, b) => b.downloads - a.downloads)
		.slice(0, 3);
	console.log(chalk.cyan('\nTop 3 gói có lượt tải cao nhất:'));
	topPackages.forEach((pkg, index) =>
		console.log(chalk.white(`${index + 1}. ${pkg.name}: ${pkg.downloads} lượt tải`))
	);
}

displayDownloadStats();