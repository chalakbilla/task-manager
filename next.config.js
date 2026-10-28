/** @type {import('next').NextConfig} */
module.exports = {
  // Local dev only: forward /api/* to the Flask server so the browser sees ONE origin
  // (same as production, where Vercel routes /api/* to the Python function).
  async rewrites() {
    if (process.env.NODE_ENV === "production") return [];
    return [{ source: "/api/:path*", destination: "http://127.0.0.1:5000/api/:path*" }];
  },
};
