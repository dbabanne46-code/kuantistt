import "./globals.css";

export const metadata = {
  title: "Kuantist AI",
  description: "Mixture of Experts AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body className="bg-gray-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}