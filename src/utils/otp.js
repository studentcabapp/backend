// utils/otp.js
export function generate6DigitCode() {
  // Ensures leading zeros preserved when converted to string
  return Math.floor(100000 + Math.random() * 900000).toString();
}
