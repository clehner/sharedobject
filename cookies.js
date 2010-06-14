function Cookies(doc) {
	SharedObject.call(this);
	if (!doc) { doc = document; }
	this.bind(function (key, value) {
		doc.cookie = key + "=" + value;
	}, this);
	var cookieRegex = new RegExp(/([^ =]+)=([^;]+)/g);
	var cookieText;
	function update() {
		if (cookieText == doc.cookie) {
			return;
		}
		cookieText = doc.cookie;
		var match;
		while (match = cookieRegex.exec(cookieText)) {
			this.set(match[1], match[2], this);
		}
	}
	update();
	setInterval(update, 1000);
}
Cookies.prototype = new SharedObject();