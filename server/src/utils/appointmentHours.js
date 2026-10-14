function isDuringOfficeHours(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    && date.getUTCDay() >= 1 && date.getUTCDay() <= 5
    && hour >= 8 && hour <= 17 && minute >= 0 && minute < 60
    && (hour < 17 || minute === 0);
}

const officeHoursMessage = 'Appointments are available Monday through Friday, from 8:00 AM to 5:00 PM.';

module.exports = { isDuringOfficeHours, officeHoursMessage };
