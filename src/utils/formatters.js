function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < sizes.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(1)} ${sizes[i]}`;
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (days) parts.push(`${days}g`);
  if (hours) parts.push(`${hours}h`);
  parts.push(`${mins}m`);
  return parts.join(' ') || '0m';
}

module.exports = {
  formatBytes,
  formatUptime,
};
