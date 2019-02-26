 //https://stackoverflow.com/questions/6234773/can-i-escape-html-special-chars-in-javascript
 function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// convert to a string, truncating long arrays
function elidedStringify(obj, no_escape) {
    return escapeHtml(JSON.stringify(obj,
        function (k, v) {
            if (!isNaN(v)) return Math.floor(v * 10) / 10.0;
            if (v.join && v.length>6) return Array.from(v.slice(0, 6)).concat("... ["+(v.length-6)+" more]");
            else return v;
        }, 4));
}