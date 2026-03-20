/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {
    buildActivity: false, // O sağ alttaki logoyu kapatır
  },
};

export default nextConfig; 
// (Eğer dosyanın adı sadece .js ise "export default nextConfig;" yerine "module.exports = nextConfig;" yaz)