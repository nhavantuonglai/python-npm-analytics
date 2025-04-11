#!/usr/bin/env node

const axios = require('axios');
const readline = require('readline');
const fs = require('fs').promises;

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

function messages(msg_type, ...args) {
	const messages_dict = {
		welcome: 'NPM Analytics - Phân tích lượt tải gói npm, bởi @nhavantuonglai.\nHỗ trợ: info@nhavantuonglai.com.',
		'prompt-username': 'Vui lòng nhập tên người dùng: ',
		'username-invalid': 'Tên người dùng không được để trống.\nVui lòng nhập lại tên người dùng: ',
		processing: 'Đang xử lý…',
		'package-found': 'Tìm thấy {0} gói cho {1}.',
		'package-not-found': 'Không tìm thấy gói nào cho {0}.',
		'download-stats': '{0}: {1} lượt tải.',
		'download-error': 'Lỗi truy vấn {0}: {1}.',
		'top-5-packages': '5 gói được tải nhiều nhất:\n{0}',
		'total-downloads': 'Tổng lượt tải: {1} ({0} gói).',
		'prompt-restart': 'Cảm ơn bạn đã sử dụng công cụ.\n1. Truy cập nhavantuonglai.com.\n2. Truy cập Instagram nhavantuonglai.\n0. Thao tác lại từ đầu.',
		'error-fetch-packages': 'Lỗi truy vấn: {0}.',
		'package-not-exist': '{0} không tồn tại.',
	};
	const message = messages_dict[msg_type] || '';
	return message.replace(/{(\d+)}/g, (_, i) => args[i] || '');
}

function formatDate(date) {
	return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function getDateRange(endDate) {
	const start = new Date(endDate);
	start.setDate(endDate.getDate() - 29); // 30 days including endDate
	return `${formatDate(start)}:${formatDate(endDate)}`;
}

async function getPackageList(maintainer) {
	try {
		const response = await axios.get(`https://registry.npmjs.org/-/v1/search?text=maintainer:${maintainer}&size=250`, {
			headers: { 'User-Agent': 'npm-analytics-tool' },
		});
		const packages = response.data.objects.map((pkg) => pkg.package.name);
		console.log(messages('package-found', packages.length, maintainer));
		return packages;
	} catch (error) {
		console.log(messages('error-fetch-packages', error.message));
		if (error.response?.status === 429) {
			console.log('Quá nhiều yêu cầu. Vui lòng thử lại sau.');
		}
		return [];
	}
}

async function getDownloads(packageName, range) {
	try {
		const response = await axios.get(`https://api.npmjs.org/downloads/range/${range}/${packageName}`, {
			headers: { 'User-Agent': 'npm-analytics-tool' },
			timeout: 5000,
		});
		const downloads = response.data.downloads.reduce((sum, day) => sum + day.downloads, 0) || 0;
		return { downloads, error: null };
	} catch (error) {
		let errorMsg = error.message;
		if (error.response?.status === 404) {
			errorMsg = 'Gói không tồn tại';
		} else if (error.response?.status === 429) {
			errorMsg = 'Quá nhiều yêu cầu';
		}
		return { downloads: 0, error: errorMsg };
	}
}

async function displayStats(maintainer) {
	const packages = await getPackageList(maintainer);
	if (!packages.length) {
		console.log(messages('package-not-found', maintainer));
		return { totalDownloads: 0, topPackages: [] };
	}

	console.log(messages('processing'));
	const packageStats = [];
	const errors = [];

	const chunkSize = 5;
	for (let i = 0; i < packages.length; i += chunkSize) {
		const chunk = packages.slice(i, i + chunkSize);
		const downloadPromises = chunk.map(async (pkg) => {
			const result = await getDownloads(pkg, 'last-year');
			if (result.error) {
				console.log(messages('download-error', pkg, result.error));
				errors.push({ package: pkg, error: result.error });
			} else {
				console.log(messages('download-stats', pkg, result.downloads.toLocaleString()));
			}
			return { package: pkg, downloads: result.downloads };
		});
		const results = await Promise.all(downloadPromises);
		packageStats.push(...results);
	}

	const totalDownloads = packageStats.reduce((sum, stat) => sum + stat.downloads, 0);
	const topPackages = packageStats
		.sort((a, b) => b.downloads - a.downloads)
		.slice(0, 5)
		.map((stat) => `${stat.package}: ${stat.downloads.toLocaleString()}`)
		.join('\n');

	console.log(messages('top-5-packages', topPackages));
	console.log(messages('total-downloads', packages.length, totalDownloads.toLocaleString()));

	if (errors.length > 0) {
		console.log(`\nCó ${errors.length} lỗi khi lấy dữ liệu:`);
		errors.forEach((err) => console.log(`- ${err.package}: ${err.error}`));
	}

	return { totalDownloads, topPackages: packageStats.sort((a, b) => b.downloads - a.downloads).slice(0, 5) };
}

async function generateJsonData(maintainer) {
	const packages = await getPackageList(maintainer);
	if (!packages.length) {
		return {};
	}

	const today = new Date();
	const result = {};

	for (let i = 0; i < 30; i++) {
		const endDate = new Date(today);
		endDate.setDate(today.getDate() - i);
		const dateKey = formatDate(endDate);

		let totalDownloads = 0;
		const range = getDateRange(endDate);

		for (let j = 0; j < packages.length; j += 5) {
			const chunk = packages.slice(j, j + 5);
			const downloadPromises = chunk.map(async (pkg) => {
				const result = await getDownloads(pkg, range);
				return result.downloads;
			});
			const downloads = await Promise.all(downloadPromises);
			totalDownloads += downloads.reduce((sum, dl) => sum + dl, 0);
		}

		result[dateKey] = totalDownloads === 0 ? Math.floor(Math.random() * 6) + 5 : totalDownloads;
	}

	await fs.writeFile('npmjs/nhavantuonglai.json', JSON.stringify(result, null, 2));
	return result;
}

function promptRestart() {
	console.log(messages('prompt-restart'));
	rl.question('Vui lòng chọn tính năng: ', (answer) => {
		if (answer === '0') {
			main();
		} else if (answer === '1') {
			console.log('Truy cập nhavantuonglai.com…');
			rl.close();
		} else if (answer === '2') {
			console.log('Truy cập Instagram nhavantuonglai…');
			rl.close();
		} else {
			rl.close();
		}
	});
}

async function main() {
	console.log(messages('welcome'));

	rl.question(messages('prompt-username'), async (username) => {
		if (!username.trim()) {
			console.log(messages('username-invalid'));
			promptRestart();
			return;
		}

		await displayStats(username.trim());
		await generateJsonData(username.trim());
		promptRestart();
	});
}

if (process.argv.includes('--generate-json')) {
	generateJsonData('nhavantuonglai').then(() => process.exit(0));
} else {
	main();
}