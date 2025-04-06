/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['antd', '@ant-design', 'rc-util', 'rc-pagination', 'rc-picker'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'production'
          ? 'https://api.your-production-domain.com/:path*'
          : `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
        has: [
          {
            type: 'header',
            key: 'content-type',
            value: '(.*)',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig; 