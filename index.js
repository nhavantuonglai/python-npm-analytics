#!/usr/bin/env node

const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

function messages(msg_type, …args) {
	const messages_dict = {
		"welcome": "NPM Analytics là công cụ phân tích thống kê lượt tải gói npm, được phát triển bởi @nhavantuonglai.\nHỗ trợ kỹ thuật: info@nhavantuonglai.com.",
		"prompt-username": "Nhập tên người dùng: ",
		"username-invalid": "Tên người dùng không được để trống.\nVui lòng tên người dùng: ",
		"processing": "Đang xử lý…",
		"package-found": "Tìm thấy {0} gói cho {1}: {2}",
		"package-not-found": "Tìm thấy 0 gói cho {0}.",
		"download-stats": "Gói {0}: {1} lượt tải.",
		"total-downloads": "Tổng cộng: {0} lượt tải.",
		"prompt-restart": "Cảm ơn bạn đã sử dụng công cụ.\n1. Truy cập nhavantuonglai.com.\n2. Truy cập Instagram nhavantuonglai.\n0. Thao tác lại từ đầu.\nVui lòng chọn tính năng: ",
		"error-fetch-packages": "Lỗi khi lấy danh sách gói: {0}.",
		"error-fetch-downloads": "Lỗi khi lấy lượt tải cho {0}: {1}.",
		"package-not-exist": "Gói {0} không tồn tại trên hệ thống."
	};
	const message = messages_dict[msg_type] || "";
	return message.replace(/{(\d+)}/g, (_, i) => args[i] || "");
}

async function getPackageList(maintainer) {
	try {
		const response = await axios.get(`https://registry.npmjs.org/-/v1/search?text=maintainer:${maintainer}`, {
			headers: { 'User-Agent': 'npm-analytics-tool' } // Thêm header để tránh bị chặn
		});
		const packages = response.data.objects.map(pkg => pkg.package.name);
		console.log(messages("package-found", packages.length, maintainer, packages.join(', ')));
		return packages;
	} catch (error) {
		console.log(messages("error-fetch-packages", error.message));
		if (error.response && error.response.status === 429) {
			console.log("Quá nhiều yêu cầu. Vui lòng thử lại sau vài phút.");
		}
		return [];
	}
}

async function getDownloads(packageName) {
	try {
		const response = await axios.get(`https://api.npmjs.org/downloads/range/last-12-months/${packageName}`, {
			headers: { 'User-Agent': 'npm-analytics-tool' }
		});
		const downloads = response.data.downloads.reduce((sum, day) => sum + day.downloads, 0) || 0;
		return downloads;
	} catch (error) {
		if (error.response && error.response.status === 404) {
			console.log(messages("package-not-exist", packageName));
			return 0;
		}
		console.log(messages("error-fetch-downloads", packageName, error.message));
		return 0;
	}
}

async function displayStats(maintainer) {
	const packages = await getPackageList(maintainer);
	if (!packages.length) {
		console.log(messages("package-not-found", maintainer));
		return;
	}

	console.log(messages("processing"));
	const downloadPromises = packages.map(async (pkg) => {
		const downloads = await getDownloads(pkg);
		console.log(messages("download-stats", pkg, downloads.toLocaleString()));
		return downloads;
	});

	const downloads = await Promise.all(downloadPromises);
	const totalDownloads = downloads.reduce((sum, dl) => sum + dl, 0);
	console.log(messages("total-downloads", totalDownloads.toLocaleString()));
}

function promptRestart() {
	console.log(messages("prompt-restart"));
	rl.question('', (answer) => {
		if (answer === '0') {
			main();
		} else if (answer === '1') {
			console.log('Mở nhavantuonglai.com…');
			rl.close();
		} else if (answer === '2') {
			console.log('Mở Instagram nhavantuonglai…');
			rl.close();
		} else {
			rl.close();
		}
	});
}

async function main() {
	console.log(messages("welcome"));
	
	rl.question(messages("prompt-username"), async (username) => {
		if (!username.trim()) {
			console.log(messages("username-invalid"));
			promptRestart();
			return;
		}

		await displayStats(username.trim());
		promptRestart();
	});
}

main();